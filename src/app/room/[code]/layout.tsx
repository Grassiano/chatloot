import { RoomProvider } from "@/components/room/room-provider";

interface RoomLayoutProps {
  children: React.ReactNode;
  params: Promise<{ code: string }>;
}

export default async function RoomLayout({ children, params }: RoomLayoutProps) {
  const { code } = await params;

  return <RoomProvider code={code}>{children}</RoomProvider>;
}
