// const axios    = require('axios');
// const {NodeHtmlMarkdown} = require('node-html-markdown');
// const { Readability } = require('@mozilla/readability');
// const { JSDOM } = require('jsdom');
// const url_to_dom = async (url) => {
//     try {
//         const response  = await fetch( url );
//         if (!response.ok) { throw new Error(`HTTP Error: ${response.status}`) }
//         const html = await response.text()
//         const jsdom = new JSDOM( html, { url } )
//         return { html, dom: jsdom.window.document }
//     } catch( error ) {
//         console.error('/url_to_dom:', error);
//     }
//     return null
// }


// const html_to_markdown = (html) => {
//     let markdown = NodeHtmlMarkdown.translate(html)
//     if (markdown.slice(0, 25).toLowerCase().includes('skip')) {
//         const firstNewlineIndex = markdown.indexOf('\n');
//         if (firstNewlineIndex !== -1) {
//             markdown = markdown.slice(firstNewlineIndex + 1).trim();
//         }
//     }
//     return markdown
// }


// const scrape_page = async (params={}) => {
//     const {dom, html, url, upload, screenshot} = params
//     const meta = {}
//     const metaTags = dom.querySelectorAll('meta[property^="og:"]')
//     metaTags.forEach(tag => {
//         const property = tag.getAttribute('property')
//             .replace('og:', '')
//             .replace(':', '_')
//         const content = tag.getAttribute('content')
//         if (property && content) {
//             meta[property] = content;
//         }
//     })
//     meta.domain = new URL(url).hostname
//     meta.domain = meta.domain.replace('www.', '')
//     meta.title  = dom.querySelector('title')?.textContent ?? meta.title ?? meta.site_name ?? meta.domain
//     meta.title  = meta.title.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
//     if (meta.site_name && meta.title && meta.title.length > meta.site_name.length + 5) {
//         const siteNamePattern = new RegExp(`^${meta.site_name}\\s*|\\s*${meta.site_name}$`, 'gi');
//         meta.title = meta.title.replace(siteNamePattern, '').replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
//     }
//     if( upload?.path ) {
//         const image = await take_screenshot({
//             html      : html,
//             upload    : upload,
//             screenshot: screenshot ?? { fullPage: true },
//         });
//         meta.screenshot = image.url ?? null
//     }
//     return meta
// }