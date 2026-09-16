// Sumber tunggal JWT_SECRET. Fail-fast: tidak pernah diam-diam memakai
// secret publik yang bisa ditebak. Wajib diatur lewat environment (.env).
const rawSecret = process.env.JWT_SECRET;
if (!rawSecret) {
  throw new Error(
    "JWT_SECRET tidak diatur. Tetapkan JWT_SECRET di environment (.env) sebelum menjalankan aplikasi."
  );
}

export const JWT_SECRET: string = rawSecret;
