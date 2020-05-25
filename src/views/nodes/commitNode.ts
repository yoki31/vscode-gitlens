'use strict';
import * as paths from 'path';
import { Command, MarkdownString, ThemeColor, ThemeIcon, TreeItem, TreeItemCollapsibleState } from 'vscode';
import { Commands, DiffWithPreviousCommandArgs } from '../../commands';
import { CommitFileNode } from './commitFileNode';
import { ViewFilesLayout } from '../../configuration';
import { GlyphChars } from '../../constants';
import { Container } from '../../container';
import { FileNode, FolderNode } from './folderNode';
import {
	CommitFormatter,
	GitBranch,
	GitLogCommit,
	GitRemote,
	GitRevisionReference,
	IssueOrPullRequest,
	PullRequest,
	RemoteProvider,
} from '../../git/git';
import { PullRequestNode } from './pullRequestNode';
import { StashesView } from '../stashesView';
import { Arrays, debug, gate, Promises, Strings } from '../../system';
import { ViewsWithFiles } from '../viewBase';
import { ContextValues, ViewNode, ViewRefNode } from './viewNode';
import { TagsView } from '../tagsView';

export class CommitNode extends ViewRefNode<ViewsWithFiles, GitRevisionReference> {
	constructor(
		view: ViewsWithFiles,
		parent: ViewNode,
		public readonly commit: GitLogCommit,
		private readonly unpublished?: boolean,
		public readonly branch?: GitBranch,
		private readonly getBranchAndTagTips?: (sha: string, compact?: boolean) => string | undefined,
		private readonly _options: { expand?: boolean } = {},
	) {
		super(commit.toGitUri(), view, parent);
	}

	toClipboard(): string {
		let message = this.commit.message;
		const index = message.indexOf('\n');
		if (index !== -1) {
			message = `${message.substring(0, index)}${GlyphChars.Space}${GlyphChars.Ellipsis}`;
		}

		return `${this.commit.shortSha}: ${message}`;
	}

	get ref(): GitRevisionReference {
		return this.commit;
	}

	async getChildren(): Promise<ViewNode[]> {
		const commit = this.commit;

		let children: (PullRequestNode | FileNode)[] = commit.files.map(
			s => new CommitFileNode(this.view, this, s, commit.toFileCommit(s)!),
		);

		if (this.view.config.files.layout !== ViewFilesLayout.List) {
			const hierarchy = Arrays.makeHierarchical(
				children as FileNode[],
				n => n.uri.relativePath.split('/'),
				(...parts: string[]) => Strings.normalizePath(paths.join(...parts)),
				this.view.config.files.compact,
			);

			const root = new FolderNode(this.view, this, this.repoPath, '', hierarchy);
			children = root.getChildren() as FileNode[];
		} else {
			(children as FileNode[]).sort((a, b) =>
				a.label!.localeCompare(b.label!, undefined, { numeric: true, sensitivity: 'base' }),
			);
		}

		if (!(this.view instanceof StashesView) && !(this.view instanceof TagsView)) {
			if (this.view.config.pullRequests.enabled && this.view.config.pullRequests.showForCommits) {
				const pr = await commit.getAssociatedPullRequest();
				if (pr != null) {
					children.splice(0, 0, new PullRequestNode(this.view, this, pr, commit));
				}
			}
		}

		return children;
	}

	async getTreeItem(): Promise<TreeItem> {
		const label = CommitFormatter.fromTemplate(this.view.config.formats.commits.label, this.commit, {
			dateFormat: Container.config.defaultDateFormat,
			getBranchAndTagTips: (sha: string) => this.getBranchAndTagTips?.(sha, true),
			messageTruncateAtNewLine: true,
		});

		const item = new TreeItem(
			label,
			this._options.expand ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.Collapsed,
		);

		item.contextValue = `${ContextValues.Commit}${this.branch?.current ? '+current' : ''}${
			this.branch?.current && this.branch.sha === this.commit.ref ? '+HEAD' : ''
		}${this.unpublished ? '+unpublished' : ''}${
			this._details == null
				? '+details'
				: `${this._details?.autolinkedIssuesOrPullRequests != null ? '+autolinks' : ''}${
						this._details?.pr != null ? '+pr' : ''
				  }`
		}`;

		item.description = CommitFormatter.fromTemplate(this.view.config.formats.commits.description, this.commit, {
			dateFormat: Container.config.defaultDateFormat,
			messageTruncateAtNewLine: true,
		});
		item.iconPath = this.unpublished
			? new ThemeIcon('arrow-up', new ThemeColor('gitlens.viewCommitToPushIconColor'))
			: !(this.view instanceof StashesView) && this.view.config.avatars
			? await this.commit.getAvatarUri({ defaultStyle: Container.config.defaultGravatarsStyle })
			: new ThemeIcon('git-commit');

		if (this._details != null) {
			item.tooltip = (await this.getTooltip()) as any;
		}

		return item;
	}

	getCommand(): Command | undefined {
		const commandArgs: DiffWithPreviousCommandArgs = {
			commit: this.commit,
			uri: this.uri,
			line: 0,
			showOptions: {
				preserveFocus: true,
				preview: true,
			},
		};
		return {
			title: 'Open Changes with Previous Revision',
			command: Commands.DiffWithPrevious,
			arguments: [undefined, commandArgs],
		};
	}

	async resolveTreeItem(item: TreeItem): Promise<TreeItem> {
		if (item.tooltip == null) {
			if (this._details == null) {
				await this.loadDetails();
			}

			item.tooltip = (await this.getTooltip()) as any;
		}
		return item;
	}

	private _details:
		| {
				autolinkedIssuesOrPullRequests:
					| Map<string, IssueOrPullRequest | Promises.CancellationError | undefined>
					| undefined;
				pr: PullRequest | undefined;
				remotes: GitRemote<RemoteProvider>[];
		  }
		| undefined = undefined;

	async loadDetails() {
		if (this._details != null) return;

		const remotes = await Container.git.getRemotes(this.commit.repoPath);
		const remote = await Container.git.getRichRemoteProvider(remotes);
		if (remote?.provider == null) return;

		const [autolinkedIssuesOrPullRequests, pr] = await Promise.all([
			Container.autolinks.getIssueOrPullRequestLinks(this.commit.message, remote),
			Container.git.getPullRequestForCommit(this.commit.ref, remote.provider),
		]);

		this._details = {
			autolinkedIssuesOrPullRequests: autolinkedIssuesOrPullRequests,
			pr: pr,
			remotes: remotes,
		};

		// TODO@eamodio
		// Add autolinks action to open a quickpick to pick the autolink
		// Add pr action to open the pr

		setTimeout(() => void this.triggerChange(), 50);
	}

	@gate()
	@debug()
	refresh(reset?: boolean) {
		if (reset) {
			this._details = undefined;
		}
	}

	private async getTooltip() {
		const tooltip = await CommitFormatter.fromTemplateAsync(
			Container.config.hovers.detailsMarkdownFormat,
			// this.commit.isUncommitted
			// 	? `\${author} ${GlyphChars.Dash} \${id}\n\${ago} (\${date})`
			// 	: `\${author}\${ (email)}\${" via "pullRequest} ${GlyphChars.Dash} \${id}${
			// 			this.unpublished ? ' (unpublished)' : ''
			// 	  }\${ (tips)}\n\${ago} (\${date})\${\n\nmessage}${this.commit.getFormattedDiffStatus({
			// 			expand: true,
			// 			prefix: '\n\n',
			// 			separator: '\n',
			// 	  })}\${\n\n${GlyphChars.Dash.repeat(2)}\nfootnotes}`,
			this.commit,
			{
				autolinkedIssuesOrPullRequests: this._details?.autolinkedIssuesOrPullRequests,
				dateFormat: Container.config.defaultDateFormat,
				getBranchAndTagTips: this.getBranchAndTagTips,
				markdown: true,
				messageAutolinks: true,
				messageIndent: 4,
				pullRequestOrRemote: this._details?.pr,
				remotes: this._details?.remotes,
			},
		);

		const markdown = new MarkdownString(tooltip, true);
		markdown.isTrusted = true;

		return markdown;
	}
}
