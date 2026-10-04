import Image from "next/image";
import type { ReactNode } from "react";
import styles from "./dsu-mascot.module.css";

type MascotFile =
  | "maskot_one.webp"
  | "maskot_two.webp"
  | "maskot_tree.webp"
  | "maskot_four.webp"
  | "maskot_five.webp";
export function DSUMascot({
  file = "maskot_two.webp",
  compact = false,
  large = false,
}: {
  file?: MascotFile;
  compact?: boolean;
  large?: boolean;
}) {
  return (
    <div
      className={`${styles.mascot} ${compact ? styles.compact : ""} ${large ? styles.large : ""}`}
    >
      <Image
        src={`/images/maskot/${file}`}
        alt=""
        fill
        unoptimized
        sizes={large ? "280px" : compact ? "80px" : "140px"}
      />
    </div>
  );
}
export function MascotHeading({
  children,
  file,
  compact = false,
}: {
  children: ReactNode;
  file?: MascotFile;
  compact?: boolean;
}) {
  return (
    <div className={styles.heading}>
      <DSUMascot file={file} compact={compact} />
      <div className={styles.copy}>{children}</div>
    </div>
  );
}
