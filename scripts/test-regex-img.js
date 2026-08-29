const sample = '<p><strong><img src="data:image/webp;base64,UklGRm123456789" /></strong></p>';

function decodeHtmlText(raw) {
  let text = raw.replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi, (_match, src) => {
    return ` <img src="${src}" alt="Gambar Soal" /> `;
  });
  console.log("After step 1:", text);
  text = text.replace(/<(?!\/?img\b)[^>]+>/gi, "");
  console.log("After step 2:", text);
  return text;
}

console.log("Result:", decodeHtmlText(sample));
