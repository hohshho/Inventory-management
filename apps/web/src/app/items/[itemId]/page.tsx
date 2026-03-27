import { ItemDetailScreen } from "@/components/screens/item-detail-screen";

type ItemDetailPageProps = {
  params: Promise<{
    itemId: string;
  }>;
};

export default async function ItemDetailPage({ params }: ItemDetailPageProps) {
  const { itemId } = await params;

  return <ItemDetailScreen itemId={itemId} />;
}
