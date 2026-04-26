/**
 * HTML to Markdown converter
 * Ported from the n8n "To Markdown" node logic.
 */

export function htmlToMarkdown(html: string): string {
  let md = html;

  // <figure> and <img>
  md = md.replace(/<figure[^>]*>/g, '')
    .replace(/<\/figure>/g, '')
    .replace(/<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/g, '![$2]($1)')
    .replace(/<img[^>]*src="([^"]+)"[^>]*>/g, '![]($1)');

  // <figcaption>
  md = md.replace(/<figcaption[^>]*>/g, '')
    .replace(/<\/figcaption>/g, '\n');

  // Headings
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n');

  // Bold and italic
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');

  // Links <a>
  md = md.replace(/<a[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g, '[$2]($1)');

  // <p>
  md = md.replace(/<p[^>]*>/g, '\n\n')
    .replace(/<\/p>/g, '\n\n');

  // <blockquote>
  md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (_, content) => {
    return content.split('\n').map((line: string) => `> ${line.trim()}`).join('\n');
  });

  // <ul> / <ol> / <li>
  md = md.replace(/<ul[^>]*>/g, '\n')
    .replace(/<\/ul>/g, '\n')
    .replace(/<ol[^>]*>/g, '\n')
    .replace(/<\/ol>/g, '\n')
    .replace(/<li[^>]*>/g, '- ')
    .replace(/<\/li>/g, '\n');

  // <code> and <pre>
  md = md.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '\n```\n$1\n```\n')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');

  // <div>
  md = md.replace(/<div[^>]*>/g, '\n')
    .replace(/<\/div>/g, '\n');

  // <br>
  md = md.replace(/<br\s*\/?>/gi, '\n');

  // <hr>
  md = md.replace(/<hr[^>]*>/gi, '\n---\n');

  // Remove all remaining HTML tags
  md = md.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  md = md.replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // Clean up excessive blank lines
  md = md.replace(/\n{3,}/g, '\n\n').trim();

  return md;
}
