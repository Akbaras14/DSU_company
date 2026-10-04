import { Storefront, type CustomerView } from "./storefront";
/** Customer routes backed by the MySQL API. */
export function CustomerPage({
  view,
  id,
}: {
  view: CustomerView;
  id?: string;
}) {
  return <Storefront view={view} id={id} />;
}
