// Turn a YouTube or TikTok link into something we can embed.
export function toEmbed(url) {
  if (!url) return null;
  const u = url.trim();

  // YouTube: watch?v=, youtu.be/, shorts/, embed/
  let m =
    u.match(/youtube\.com\/watch\?[^#]*v=([\w-]{6,})/) ||
    u.match(/youtu\.be\/([\w-]{6,})/) ||
    u.match(/youtube\.com\/shorts\/([\w-]{6,})/) ||
    u.match(/youtube\.com\/embed\/([\w-]{6,})/);
  if (m) {
    const vertical = /shorts\//.test(u);
    return { src: "https://www.youtube.com/embed/" + m[1] + "?rel=0", vertical };
  }

  // TikTok: /video/1234567890
  m = u.match(/tiktok\.com\/.*\/video\/(\d+)/) || u.match(/tiktok\.com\/embed\/v2\/(\d+)/);
  if (m) return { src: "https://www.tiktok.com/embed/v2/" + m[1], vertical: true };

  return null;
}
