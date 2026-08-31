import { TourScreen } from "@/components/tour/tour-screen";
import { getDictionary } from "@/i18n/server";

/** The title and the description follow the language cookie too. */
export async function generateMetadata() {
  const t = await getDictionary();

  return { title: t.tour.title, description: t.tour.metaDescription };
}

/**
 * The tour.
 *
 * It reads nothing and belongs to nobody, so it is the one page in here that
 * can be handed to somebody who has never opened the app and has no session.
 */
export default function TourPage() {
  return <TourScreen />;
}
