import { ChatInterface } from "@/components/chat/chat-interface";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function ChatPage({ searchParams }: Props) {
  const params = await searchParams;
  const initialMessage = params.q ? decodeURIComponent(params.q) : undefined;

  return (
    <div className="h-full">
      <ChatInterface initialMessage={initialMessage} />
    </div>
  );
}
