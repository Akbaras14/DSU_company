import { z } from "zod";
import { db } from "./db.js";
import { contactSchema } from "./orders.js";
import { userSelect } from "./auth.js";
import { HttpError } from "./http.js";

const region = (digits: number) =>
  z
    .string()
    .regex(new RegExp(`^(?:|\\d{${digits}})$`))
    .default("");
export const profileSchema = contactSchema
  .extend({
    provinceId: region(2),
    regencyId: region(4),
    districtId: region(7),
    villageId: region(10),
    postalCode: region(5),
  })
  .strict()
  .superRefine((input, context) => {
    const values = [
      input.provinceId,
      input.regencyId,
      input.districtId,
      input.villageId,
      input.postalCode,
    ];
    if (values.some(Boolean) && !values.every(Boolean))
      context.addIssue({
        code: "custom",
        message: "Lengkapi seluruh wilayah dan kode pos.",
        path: ["villageId"],
      });
  });

export async function updateProfile(userId: string, body: unknown) {
  const input = profileSchema.parse(body);
  if (input.villageId) {
    const village = await db.village.findUnique({
      where: { id: input.villageId },
      include: { district: { include: { regency: true } } },
    });
    if (
      !village ||
      village.districtId !== input.districtId ||
      village.district.regencyId !== input.regencyId ||
      village.district.regency.provinceId !== input.provinceId
    )
      throw new HttpError(
        400,
        "Pilihan wilayah tidak sesuai. Pilih kembali alamat Anda.",
      );
  }
  return db.user.update({
    where: { id: userId },
    data: input,
    select: userSelect,
  });
}
