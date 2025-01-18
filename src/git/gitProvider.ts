import type { CancellationToken, Disposable, Event, Range, TextDocument, Uri, WorkspaceFolder } from 'vscode';
import type { Commit, InputBox } from '../@types/vscode.git';
import type { ForcePushMode } from '../@types/vscode.git.enums';
import type { GitConfigKeys } from '../constants';
import type { SearchQuery } from '../constants.search';
import type { Features } from '../features';
import type { HostingIntegration } from '../plus/integrations/integration';
import type { GitUri } from './gitUri';
import type { GitBlame, GitBlameLine } from './models/blame';
import type { GitBranch } from './models/branch';
import type { GitCommit, GitCommitStats } from './models/commit';
import type { GitContributor, GitContributorStats } from './models/contributor';
import type { GitDiff, GitDiffFile, GitDiffFiles, GitDiffFilter, GitDiffLine, GitDiffShortStat } from './models/diff';
import type { GitFile } from './models/file';
import type { GitFileChange } from './models/fileChange';
import type { GitGraph } from './models/graph';
import type { GitLog } from './models/log';
import type { MergeConflict } from './models/mergeConflict';
import type { GitPausedOperationStatus } from './models/pausedOperationStatus';
import type { GitBranchReference, GitReference } from './models/reference';
import type { GitReflog } from './models/reflog';
import type { GitRemote } from './models/remote';
import type { Repository, RepositoryChangeEvent } from './models/repository';
import type { GitRevisionRange } from './models/revision';
import type { GitStash } from './models/stash';
import type { GitStatus } from './models/status';
import type { GitStatusFile } from './models/statusFile';
import type { GitTag } from './models/tag';
import type { GitTreeEntry } from './models/tree';
import type { GitUser } from './models/user';
import type { GitWorktree } from './models/worktree';
import type { RemoteProvider } from './remotes/remoteProvider';
import type { GitSearch } from './search';
import type { BranchSortOptions, TagSortOptions } from './utils/-webview/sorting';

export type GitCaches =
	| 'branches'
	| 'contributors'
	| 'providers'
	| 'remotes'
	| 'stashes'
	| 'status'
	| 'tags'
	| 'worktrees';
export type GitRepositoryCaches = Extract<GitCaches, 'branches' | 'remotes'>;
export const gitRepositoryCacheKeys = new Set<GitRepositoryCaches>(['branches', 'remotes']);

export interface GitDir {
	readonly uri: Uri;
	readonly commonUri?: Uri;
}

export type GitProviderId = 'git' | 'github' | 'vsls';

export interface GitProviderDescriptor {
	readonly id: GitProviderId;
	readonly name: string;
	readonly virtual: boolean;
}

export interface RepositoryInitWatcher extends Disposable {
	readonly onDidCreate: Event<Uri>;
}

export interface ScmRepository {
	readonly rootUri: Uri;
	readonly inputBox: InputBox;

	getCommit(ref: string): Promise<Commit>;
	push(remoteName?: string, branchName?: string, setUpstream?: boolean, force?: ForcePushMode): Promise<void>;
}

export interface LeftRightCommitCountResult {
	left: number;
	right: number;
}

export interface PagedResult<T> {
	readonly paging?: {
		readonly cursor: string;
		readonly more: boolean;
	};
	readonly values: NonNullable<T>[];
}

export interface PagingOptions {
	cursor?: string;
}

export interface NextComparisonUrisResult {
	current: GitUri;
	next: GitUri | undefined;
	deleted?: boolean | undefined;
}

export interface PreviousComparisonUrisResult {
	current: GitUri;
	previous: GitUri | undefined;
}

export interface PreviousLineComparisonUrisResult extends PreviousComparisonUrisResult {
	line: number;
}

export interface RepositoryCloseEvent {
	readonly uri: Uri;
}

export interface RepositoryOpenEvent {
	readonly uri: Uri;
}

export type RepositoryVisibility = 'private' | 'public' | 'local';

export interface RepositoryVisibilityInfo {
	visibility: RepositoryVisibility;
	timestamp: number;
	remotesHash?: string;
}

export interface BranchContributionsOverview extends GitCommitStats<number> {
	readonly repoPath: string;
	readonly branch: string;
	readonly baseOrTargetBranch: string;
	readonly mergeBase: string;

	readonly commits: number;
	readonly latestCommitDate: Date | undefined;
	readonly firstCommitDate: Date | undefined;

	readonly contributors: GitContributor[];
}

export interface GitRepositoryProvider {
	reset?(repoPath: string, ref: string, options?: { hard?: boolean } | { soft?: boolean }): Promise<void>;

	checkout?(
		repoPath: string,
		ref: string,
		options?: { createBranch?: string | undefined } | { path?: string | undefined },
	): Promise<void>;
	excludeIgnoredUris(repoPath: string, uris: Uri[]): Promise<Uri[]>;

	fetch?(
		repoPath: string,
		options?: {
			all?: boolean | undefined;
			branch?: GitBranchReference | undefined;
			prune?: boolean | undefined;
			pull?: boolean | undefined;
			remote?: string | undefined;
		},
	): Promise<void>;
	pull?(
		repoPath: string,
		options?: {
			branch?: GitBranchReference | undefined;
			rebase?: boolean | undefined;
			tags?: boolean | undefined;
		},
	): Promise<void>;
	push?(
		repoPath: string,
		options?: {
			reference?: GitReference | undefined;
			force?: boolean | undefined;
			publish?: { remote: string };
		},
	): Promise<void>;

	getChangedFilesCount(repoPath: string, ref?: string): Promise<GitDiffShortStat | undefined>;
	getCommit(repoPath: string, ref: string): Promise<GitCommit | undefined>;
	getCommitCount(repoPath: string, ref: string): Promise<number | undefined>;
	getCommitFileStats?(repoPath: string | Uri, ref: string): Promise<GitFileChange[] | undefined>;
	getCommitForFile(
		repoPath: string,
		uri: Uri,
		options?: {
			ref?: string | undefined;
			firstIfNotFound?: boolean | undefined;
			range?: Range | undefined;
		},
	): Promise<GitCommit | undefined>;
	getCommitsForGraph(
		repoPath: string,
		asWebviewUri: (uri: Uri) => Uri,
		options?: {
			include?: { stats?: boolean };
			limit?: number;
			ref?: string;
		},
	): Promise<GitGraph>;
	getCommitTags(
		repoPath: string,
		ref: string,
		options?: {
			commitDate?: Date | undefined;
			mode?: 'contains' | 'pointsAt' | undefined;
		},
	): Promise<string[]>;
	getConfig?(repoPath: string, key: GitConfigKeys): Promise<string | undefined>;
	setConfig?(repoPath: string, key: GitConfigKeys, value: string | undefined): Promise<void>;
	getCurrentUser(repoPath: string): Promise<GitUser | undefined>;
	getDiff?(
		repoPath: string | Uri,
		to: string,
		from?: string,
		options?:
			| { context?: number; includeUntracked?: never; uris?: never }
			| { context?: number; includeUntracked?: never; uris: Uri[] }
			| { context?: number; includeUntracked: boolean; uris?: never },
	): Promise<GitDiff | undefined>;
	getDiffFiles?(repoPath: string | Uri, contents: string): Promise<GitDiffFiles | undefined>;
	getDiffStatus(
		repoPath: string,
		ref1OrRange: string | GitRevisionRange,
		ref2?: string,
		options?: { filters?: GitDiffFilter[]; path?: string; similarityThreshold?: number },
	): Promise<GitFile[] | undefined>;
	getFileStatusForCommit(repoPath: string, uri: Uri, ref: string): Promise<GitFile | undefined>;
	getFirstCommitSha?(repoPath: string): Promise<string | undefined>;
	getGitDir?(repoPath: string): Promise<GitDir | undefined>;
	getLastFetchedTimestamp(repoPath: string): Promise<number | undefined>;
	getLeftRightCommitCount(
		repoPath: string,
		range: GitRevisionRange,
		options?: { authors?: GitUser[] | undefined; excludeMerges?: boolean },
	): Promise<LeftRightCommitCountResult | undefined>;
	getLog(
		repoPath: string,
		options?: {
			all?: boolean | undefined;
			authors?: GitUser[] | undefined;
			cursor?: string | undefined;
			limit?: number | undefined;
			merges?: boolean | 'first-parent' | undefined;
			ordering?: 'date' | 'author-date' | 'topo' | null | undefined;
			ref?: string | undefined;
			since?: string | undefined;
		},
	): Promise<GitLog | undefined>;
	getLogRefsOnly(
		repoPath: string,
		options?: {
			authors?: GitUser[] | undefined;
			cursor?: string | undefined;
			limit?: number | undefined;
			merges?: boolean | 'first-parent';
			ordering?: 'date' | 'author-date' | 'topo' | null | undefined;
			ref?: string | undefined;
			since?: string | undefined;
		},
	): Promise<Set<string> | undefined>;
	getLogForFile(
		repoPath: string,
		pathOrUri: string | Uri,
		options?: {
			all?: boolean | undefined;
			cursor?: string | undefined;
			limit?: number | undefined;
			ordering?: 'date' | 'author-date' | 'topo' | null | undefined;
			range?: Range | undefined;
			ref?: string | undefined;
			renames?: boolean | undefined;
			reverse?: boolean | undefined;
			since?: string | undefined;
			skip?: number | undefined;
		},
	): Promise<GitLog | undefined>;
	getNextComparisonUris(
		repoPath: string,
		uri: Uri,
		ref: string | undefined,
		skip?: number,
	): Promise<NextComparisonUrisResult | undefined>;
	getOldestUnpushedRefForFile(repoPath: string, uri: Uri): Promise<string | undefined>;
	getPreviousComparisonUris(
		repoPath: string,
		uri: Uri,
		ref: string | undefined,
		skip?: number,
	): Promise<PreviousComparisonUrisResult | undefined>;
	getPreviousComparisonUrisForLine(
		repoPath: string,
		uri: Uri,
		editorLine: number,
		ref: string | undefined,
		skip?: number,
	): Promise<PreviousLineComparisonUrisResult | undefined>;
	getIncomingActivity(
		repoPath: string,
		options?: {
			all?: boolean | undefined;
			branch?: string | undefined;
			limit?: number | undefined;
			ordering?: 'date' | 'author-date' | 'topo' | null | undefined;
			skip?: number | undefined;
		},
	): Promise<GitReflog | undefined>;
	getRevisionContent(repoPath: string, path: string, ref: string): Promise<Uint8Array | undefined>;
	getTreeEntryForRevision(repoPath: string, path: string, ref: string): Promise<GitTreeEntry | undefined>;
	getTreeForRevision(repoPath: string, ref: string): Promise<GitTreeEntry[]>;
	hasBranchOrTag(
		repoPath: string | undefined,
		options?: {
			filter?:
				| { branches?: ((b: GitBranch) => boolean) | undefined; tags?: ((t: GitTag) => boolean) | undefined }
				| undefined;
		},
	): Promise<boolean>;

	hasCommitBeenPushed(repoPath: string, ref: string): Promise<boolean>;
	isAncestorOf(repoPath: string, ref1: string, ref2: string): Promise<boolean>;

	getDiffTool?(repoPath?: string): Promise<string | undefined>;
	openDiffTool?(
		repoPath: string,
		uri: Uri,
		options?: {
			ref1?: string | undefined;
			ref2?: string | undefined;
			staged?: boolean | undefined;
			tool?: string | undefined;
		},
	): Promise<void>;
	openDirectoryCompare?(repoPath: string, ref1: string, ref2?: string, tool?: string): Promise<void>;

	resolveReference(
		repoPath: string,
		ref: string,
		pathOrUri?: string | Uri,
		options?: { force?: boolean; timeout?: number | undefined },
	): Promise<string>;
	richSearchCommits(
		repoPath: string,
		search: SearchQuery,
		options?: {
			limit?: number | undefined;
			ordering?: 'date' | 'author-date' | 'topo' | null | undefined;
			skip?: number | undefined;
		},
	): Promise<GitLog | undefined>;
	searchCommits(
		repoPath: string,
		search: SearchQuery,
		options?: {
			cancellation?: CancellationToken;
			limit?: number;
			ordering?: 'date' | 'author-date' | 'topo';
		},
	): Promise<GitSearch>;

	runGitCommandViaTerminal?(
		repoPath: string,
		command: string,
		args: string[],
		options?: { execute?: boolean },
	): Promise<void>;

	validateBranchOrTagName(repoPath: string, ref: string): Promise<boolean>;
	validateReference(repoPath: string, ref: string): Promise<boolean>;

	branches: GitBranchesSubProvider;
	contributors: GitContributorsSubProvider;
	patch?: GitPatchSubProvider;
	remotes: GitRemotesSubProvider;
	staging?: GitStagingSubProvider;
	stash?: GitStashSubProvider;
	status: GitStatusSubProvider;
	tags: GitTagsSubProvider;
	worktrees?: GitWorktreesSubProvider;
}

export type MergeDetectionConfidence = 'highest' | 'high' | 'medium';

export type GitBranchMergedStatus =
	| { merged: false }
	| { merged: true; confidence: MergeDetectionConfidence; localBranchOnly?: GitBranchReference };

export interface GitBranchesSubProvider {
	getBranch(repoPath: string, name?: string): Promise<GitBranch | undefined>;
	getBranches(
		repoPath: string,
		options?: {
			filter?: ((b: GitBranch) => boolean) | undefined;
			paging?: PagingOptions | undefined;
			sort?: boolean | BranchSortOptions | undefined;
		},
	): Promise<PagedResult<GitBranch>>;
	getBranchContributionsOverview(repoPath: string, ref: string): Promise<BranchContributionsOverview | undefined>;
	getBranchesForCommit(
		repoPath: string,
		refs: string[],
		branch?: string | undefined,
		options?:
			| { all?: boolean; commitDate?: Date; mode?: 'contains' | 'pointsAt' }
			| { commitDate?: Date; mode?: 'contains' | 'pointsAt'; remotes?: boolean },
	): Promise<string[]>;
	getDefaultBranchName(repoPath: string | undefined, remote?: string): Promise<string | undefined>;
	getMergeBase(
		repoPath: string,
		ref1: string,
		ref2: string,
		options?: { forkPoint?: boolean | undefined },
	): Promise<string | undefined>;

	createBranch?(repoPath: string, name: string, ref: string): Promise<void>;
	/**
	 * Returns whether a branch has been merged into another branch
	 * @param repoPath The repository path
	 * @param branch The branch to check if merged
	 * @param into The branch to check if merged into
	 * @returns A promise of whether the branch is merged
	 */
	getBranchMergedStatus?(
		repoPath: string,
		branch: GitBranchReference,
		into: GitBranchReference,
	): Promise<GitBranchMergedStatus>;
	getLocalBranchByUpstream?(repoPath: string, remoteBranchName: string): Promise<GitBranch | undefined>;
	getPotentialMergeOrRebaseConflict?(
		repoPath: string,
		branch: string,
		targetBranch: string,
	): Promise<MergeConflict | undefined>;
	getBaseBranchName?(repoPath: string, ref: string): Promise<string | undefined>;
	setBaseBranchName?(repoPath: string, ref: string, base: string): Promise<void>;
	getTargetBranchName?(repoPath: string, ref: string): Promise<string | undefined>;
	setTargetBranchName?(repoPath: string, ref: string, target: string): Promise<void>;
	renameBranch?(repoPath: string, oldName: string, newName: string): Promise<void>;
}

export interface GitContributorsSubProvider {
	getContributorsStats(
		repoPath: string,
		options?: { merges?: boolean; since?: string },
	): Promise<GitContributorStats | undefined>;
	getContributors(
		repoPath: string,
		options?: {
			all?: boolean | undefined;
			merges?: boolean | 'first-parent';
			ref?: string | undefined;
			stats?: boolean | undefined;
		},
	): Promise<GitContributor[]>;
}

export interface GitPatchSubProvider {
	applyUnreachableCommitForPatch(
		repoPath: string,
		ref: string,
		options?: {
			branchName?: string;
			createBranchIfNeeded?: boolean;
			createWorktreePath?: string;
			stash?: boolean | 'prompt';
		},
	): Promise<void>;
	createUnreachableCommitForPatch(
		repoPath: string,
		contents: string,
		baseRef: string,
		message: string,
	): Promise<GitCommit | undefined>;
	validatePatch(repoPath: string | undefined, contents: string): Promise<boolean>;
}

export interface GitRemotesSubProvider {
	getRemote(
		repoPath: string | undefined,
		name: string,
		cancellation?: CancellationToken,
	): Promise<GitRemote | undefined>;
	getRemotes(
		repoPath: string | undefined,
		options?: { filter?: (remote: GitRemote) => boolean; sort?: boolean },
		cancellation?: CancellationToken,
	): Promise<GitRemote[]>;

	getDefaultRemote(repoPath: string, _cancellation?: CancellationToken): Promise<GitRemote | undefined>;
	getRemotesWithProviders(
		repoPath: string,
		options?: { sort?: boolean },
		cancellation?: CancellationToken,
	): Promise<GitRemote<RemoteProvider>[]>;
	getRemotesWithIntegrations(
		repoPath: string,
		options?: { sort?: boolean },
		cancellation?: CancellationToken,
	): Promise<GitRemote<RemoteProvider>[]>;
	getBestRemoteWithProvider(
		repoPath: string,
		cancellation?: CancellationToken,
	): Promise<GitRemote<RemoteProvider> | undefined>;
	getBestRemotesWithProviders(
		repoPath: string,
		cancellation?: CancellationToken,
	): Promise<GitRemote<RemoteProvider>[]>;
	getBestRemoteWithIntegration(
		repoPath: string,
		options?: {
			filter?: (remote: GitRemote, integration: HostingIntegration) => boolean;
			includeDisconnected?: boolean;
		},
		cancellation?: CancellationToken,
	): Promise<GitRemote<RemoteProvider> | undefined>;
	addRemote?(repoPath: string, name: string, url: string, options?: { fetch?: boolean }): Promise<void>;
	addRemoteWithResult?(
		repoPath: string,
		name: string,
		url: string,
		options?: { fetch?: boolean },
	): Promise<GitRemote | undefined>;
	pruneRemote?(repoPath: string, name: string): Promise<void>;
	removeRemote?(repoPath: string, name: string): Promise<void>;
	setRemoteAsDefault(repoPath: string, name: string, value?: boolean): Promise<void>;
}

export interface GitStagingSubProvider {
	stageFile(repoPath: string, pathOrUri: string | Uri, options?: { intentToAdd?: boolean }): Promise<void>;
	stageFiles(repoPath: string, pathOrUri: string[] | Uri[], options?: { intentToAdd?: boolean }): Promise<void>;
	stageDirectory(repoPath: string, directoryOrUri: string | Uri, options?: { intentToAdd?: boolean }): Promise<void>;
	unstageFile(repoPath: string, pathOrUri: string | Uri): Promise<void>;
	unstageFiles(repoPath: string, pathOrUri: string[] | Uri[]): Promise<void>;
	unstageDirectory(repoPath: string, directoryOrUri: string | Uri): Promise<void>;
}

export interface GitStashSubProvider {
	applyStash(repoPath: string, stashName: string, options?: { deleteAfter?: boolean | undefined }): Promise<void>;
	getStash(repoPath: string | undefined): Promise<GitStash | undefined>;
	getStashCommitFiles(
		repoPath: string,
		ref: string,
		options?: { include?: { stats?: boolean } },
	): Promise<GitFileChange[]>;
	deleteStash(repoPath: string, stashName: string, ref?: string): Promise<void>;
	renameStash(repoPath: string, stashName: string, ref: string, message: string, stashOnRef?: string): Promise<void>;
	saveStash(
		repoPath: string,
		message?: string,
		uris?: Uri[],
		options?: { includeUntracked?: boolean; keepIndex?: boolean; onlyStaged?: boolean },
	): Promise<void>;
	saveSnapshot(repoPath: string, message?: string): Promise<void>;
}

export interface GitStatusSubProvider {
	getStatus(repoPath: string | undefined): Promise<GitStatus | undefined>;
	getStatusForFile?(repoPath: string, uri: Uri): Promise<GitStatusFile | undefined>;
	getStatusForFiles?(repoPath: string, pathOrGlob: Uri): Promise<GitStatusFile[] | undefined>;

	getPausedOperationStatus?(repoPath: string): Promise<GitPausedOperationStatus | undefined>;
	abortPausedOperation?(repoPath: string, options?: { quit?: boolean }): Promise<void>;
	continuePausedOperation?(repoPath: string, options?: { skip?: boolean }): Promise<void>;
}

export interface GitTagsSubProvider {
	getTag(repoPath: string, name: string): Promise<GitTag | undefined>;
	getTags(
		repoPath: string,
		options?: {
			filter?: ((t: GitTag) => boolean) | undefined;
			paging?: PagingOptions | undefined;
			sort?: boolean | TagSortOptions | undefined;
		},
	): Promise<PagedResult<GitTag>>;

	createTag?(repoPath: string, name: string, ref: string, message?: string): Promise<void>;
	deleteTag?(repoPath: string, name: string): Promise<void>;
}

export interface GitWorktreesSubProvider {
	createWorktree(
		repoPath: string,
		path: string,
		options?: { commitish?: string; createBranch?: string; detach?: boolean; force?: boolean },
	): Promise<void>;
	createWorktreeWithResult(
		repoPath: string,
		path: string,
		options?: { commitish?: string; createBranch?: string; detach?: boolean; force?: boolean },
	): Promise<GitWorktree | undefined>;
	getWorktree(repoPath: string, predicate: (w: GitWorktree) => boolean): Promise<GitWorktree | undefined>;
	getWorktrees(repoPath: string): Promise<GitWorktree[]>;
	getWorktreesDefaultUri(repoPath: string): Promise<Uri | undefined>;
	deleteWorktree(repoPath: string, path: string | Uri, options?: { force?: boolean }): Promise<void>;
}

export type GitSubProvider =
	| GitBranchesSubProvider
	| GitContributorsSubProvider
	| GitPatchSubProvider
	| GitRemotesSubProvider
	| GitStagingSubProvider
	| GitStashSubProvider
	| GitStatusSubProvider
	| GitTagsSubProvider
	| GitWorktreesSubProvider;

export type GitSubProviderProps = keyof {
	[P in keyof GitProvider as NonNullable<GitProvider[P]> extends GitSubProvider ? P : never]: GitProvider[P];
};

export type NonNullableGitSubProviderProps = keyof {
	[P in keyof GitProvider as GitProvider[P] extends GitSubProvider ? P : never]: GitProvider[P];
};

export type GitSubProviderForRepo<T extends GitSubProvider> = {
	[K in keyof T]: RemoveFirstArg<T[K]>;
};

export function createSubProviderProxyForRepo<T extends GitSubProvider, U extends GitSubProviderForRepo<T>>(
	target: T,
	rp: string,
): U {
	return new Proxy(target, {
		get: (target, prop: string | symbol): unknown => {
			const value = target[prop as keyof T];
			if (typeof value === 'function') {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return
				return (...args: unknown[]) => value.call(target, rp, ...args);
			}
			return value;
		},
	}) as unknown as U;
}

export interface GitProvider extends GitRepositoryProvider, Disposable {
	get onDidChange(): Event<void>;
	get onWillChangeRepository(): Event<RepositoryChangeEvent>;
	get onDidChangeRepository(): Event<RepositoryChangeEvent>;
	get onDidCloseRepository(): Event<RepositoryCloseEvent>;
	get onDidOpenRepository(): Event<RepositoryOpenEvent>;

	readonly descriptor: GitProviderDescriptor;
	readonly supportedSchemes: Set<string>;

	discoverRepositories(
		uri: Uri,
		options?: { cancellation?: CancellationToken; depth?: number; silent?: boolean },
	): Promise<Repository[]>;
	updateContext?(): void;
	openRepository(
		folder: WorkspaceFolder | undefined,
		uri: Uri,
		root: boolean,
		suspended?: boolean,
		closed?: boolean,
	): Repository[];
	openRepositoryInitWatcher?(): RepositoryInitWatcher;

	supports(feature: Features): Promise<boolean>;
	visibility(
		repoPath: string,
		remotes?: GitRemote[],
	): Promise<[visibility: RepositoryVisibility, cacheKey: string | undefined]>;

	getOpenScmRepositories(): Promise<ScmRepository[]>;
	getScmRepository(repoPath: string): Promise<ScmRepository | undefined>;
	getOrOpenScmRepository(repoPath: string): Promise<ScmRepository | undefined>;

	canHandlePathOrUri(scheme: string, pathOrUri: string | Uri): string | undefined;
	findRepositoryUri(uri: Uri, isDirectory?: boolean): Promise<Uri | undefined>;
	getAbsoluteUri(pathOrUri: string | Uri, base: string | Uri): Uri;
	getBestRevisionUri(repoPath: string, path: string, ref: string | undefined): Promise<Uri | undefined>;
	getRelativePath(pathOrUri: string | Uri, base: string | Uri): string;
	getRevisionUri(repoPath: string, path: string, ref: string): Uri;
	// getRootUri(pathOrUri: string | Uri): Uri;
	getWorkingUri(repoPath: string, uri: Uri): Promise<Uri | undefined>;

	applyChangesToWorkingFile?(uri: GitUri, ref1?: string, ref2?: string): Promise<void>;
	clone?(url: string, parentPath: string): Promise<string | undefined>;
	/**
	 * Returns the blame of a file
	 * @param uri Uri of the file to blame
	 * @param document Optional TextDocument to blame the contents of if dirty
	 */
	getBlame(uri: GitUri, document?: TextDocument | undefined): Promise<GitBlame | undefined>;
	/**
	 * Returns the blame of a file, using the editor contents (for dirty editors)
	 * @param uri Uri of the file to blame
	 * @param contents Contents from the editor to use
	 */
	getBlameContents(uri: GitUri, contents: string): Promise<GitBlame | undefined>;
	/**
	 * Returns the blame of a single line
	 * @param uri Uri of the file to blame
	 * @param editorLine Editor line number (0-based) to blame (Git is 1-based)
	 * @param document Optional TextDocument to blame the contents of if dirty
	 * @param options.forceSingleLine Forces blame to be for the single line (rather than the whole file)
	 */
	getBlameForLine(
		uri: GitUri,
		editorLine: number,
		document?: TextDocument | undefined,
		options?: { forceSingleLine?: boolean },
	): Promise<GitBlameLine | undefined>;
	/**
	 * Returns the blame of a single line, using the editor contents (for dirty editors)
	 * @param uri Uri of the file to blame
	 * @param editorLine Editor line number (0-based) to blame (Git is 1-based)
	 * @param contents Contents from the editor to use
	 */
	getBlameForLineContents(
		uri: GitUri,
		editorLine: number,
		contents: string,
		options?: { forceSingleLine?: boolean },
	): Promise<GitBlameLine | undefined>;
	getBlameForRange(uri: GitUri, range: Range): Promise<GitBlame | undefined>;
	getBlameForRangeContents(uri: GitUri, range: Range, contents: string): Promise<GitBlame | undefined>;
	getBlameRange(blame: GitBlame, uri: GitUri, range: Range): GitBlame | undefined;
	/**
	 * Returns a file diff between two commits
	 * @param uri Uri of the file to diff
	 * @param ref1 Commit to diff from
	 * @param ref2 Commit to diff to
	 */
	getDiffForFile(uri: GitUri, ref1: string | undefined, ref2?: string): Promise<GitDiffFile | undefined>;
	/**
	 * Returns a file diff between a commit and the specified contents
	 * @param uri Uri of the file to diff
	 * @param ref Commit to diff from
	 * @param contents Contents to use for the diff
	 */
	getDiffForFileContents(uri: GitUri, ref: string, contents: string): Promise<GitDiffFile | undefined>;
	/**
	 * Returns a line diff between two commits
	 * @param uri Uri of the file to diff
	 * @param editorLine Editor line number (0-based) to blame (Git is 1-based)
	 * @param ref1 Commit to diff from
	 * @param ref2 Commit to diff to
	 */
	getDiffForLine(
		uri: GitUri,
		editorLine: number,
		ref1: string | undefined,
		ref2?: string,
	): Promise<GitDiffLine | undefined>;
	hasUnsafeRepositories?(): boolean;
	isTrackable(uri: Uri): boolean;
	isTracked(uri: Uri): Promise<boolean>;
}

export interface RevisionUriData {
	ref?: string;
	repoPath: string;
	uncPath?: string;
}
