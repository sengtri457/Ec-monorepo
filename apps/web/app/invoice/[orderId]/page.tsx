import InvoiceClient from "@/components/InvoiceClient";

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams?: Promise<{ token?: string }>;
}) {
  const { orderId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const token = resolvedSearchParams?.token;

  return <InvoiceClient orderId={orderId} token={token} />;
}
