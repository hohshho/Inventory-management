import { ItemProfileView } from "@/components/screens/item-profile-view";

type ItemDetailPageProps = {
  params: Promise<{
    itemId: string;
  }>;
};

export default async function ItemDetailPage({ params }: ItemDetailPageProps) {
  const { itemId } = await params;

  return <ItemProfileView itemId={itemId} />;
}
