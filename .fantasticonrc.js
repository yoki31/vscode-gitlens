//@ts-check

/** @type { import('fantasticon').RunnerOptions} } */
const config = {
	name: 'GitLens Icons',
	inputDir: './images/icons',
	outputDir: './dist',
	// @ts-ignore
	fontTypes: ['ttf', 'woff'],
	// @ts-ignore
	assetTypes: ['html', 'json'],
	formatOptions: {
		svg: {
			fontId: 'gitlens-icons',
			// @ts-ignore
			fontName: 'GitLens Icons',
			centerHorizontally: true,
			fixedWidth: true,
		},
		ttf: {
			copyright: 'Copyright (c) 2021 Eric Amodio',
			description: 'GitLens Icons',
			version: '1.0',
		},
		json: {
			indent: 2,
		},
	},
	codepoints: require('./images/icons/codepoints.json'),
	fontHeight: 1000,
	templates: {
		html: './icons.hbs',
	},
	pathOptions: {
		ttf: './dist/gitlens-icons.ttf',
		woff: './dist/gitlens-icons.woff',
		html: './dist/icons.json',
		json: './dist/codepoints.json',
	},
};

module.exports = config;
