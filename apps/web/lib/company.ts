export const COMPANY_ADDRESS =
  "Griya Pamulang 2 Blok E 5/9, Kelurahan Pondok Benda, Kecamatan Pamulang, Kota Tangerang Selatan, Provinsi Banten";

const addressQuery = encodeURIComponent(COMPANY_ADDRESS);
export const COMPANY_MAP_URL = `https://www.google.com/maps/search/?api=1&query=${addressQuery}`;
export const COMPANY_MAP_EMBED_URL = `https://www.google.com/maps?q=${addressQuery}&output=embed`;
