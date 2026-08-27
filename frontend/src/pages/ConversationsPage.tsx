import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageCircle, Car } from "lucide-react";
import { toast } from "sonner";
import { userApi } from "@/lib/user-auth";

type ConversationItem = {
  id: number;
  carId: number;
  customerId: number;
  sellerId: number;
  carName: string;
  carYear: number;
  brandName: string;
  customerName: string;
  sellerName: string;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  unreadCount: number;
};

export function ConversationsPage() {
  const navigate = useNavigate();

  const [conversations, setConversations] =
    useState<ConversationItem[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConversations = async () => {
      try {
        const response =
          await userApi.get("/api/messages");

        const data =
          response.data?.data;

        setConversations(
          data?.conversations ?? []
        );
      } catch (error: any) {
        console.error(
          "LOAD CONVERSATIONS ERROR:",
          error
        );

        if (error?.response?.status === 401) {
          toast.error(
            "Please sign in to view messages."
          );

          navigate("/login");

          return;
        }

        toast.error(
          error?.response?.data?.error ??
            "Could not load messages."
        );
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [navigate]);

  const currentUser = JSON.parse(
    sessionStorage.getItem("user") || "null"
  );

  const currentUserId =
    currentUser?.id ?? null;

  if (loading) {
    return (
      <main className="min-h-screen bg-[#08090a] px-6 pt-32 text-white">
        <div className="mx-auto max-w-5xl">
          Loading messages...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#08090a] px-6 pb-20 pt-32 text-white">
      <div className="mx-auto max-w-5xl">

        <div className="mb-10">
          <p className="mb-2 text-xs font-bold tracking-[0.25em] text-champagne-300 uppercase">
            Your Account
          </p>

          <h1 className="text-3xl font-bold md:text-4xl">
            Messages
          </h1>

          <p className="mt-2 text-sm text-white/40">
            View your vehicle enquiries and conversations.
          </p>
        </div>

        {conversations.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] px-6 py-16 text-center">
            <MessageCircle className="mx-auto size-8 text-white/30" />

            <p className="mt-4 font-medium">
              No conversations yet
            </p>

            <p className="mt-2 text-sm text-white/40">
              Vehicle enquiries will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {conversations
  .filter((conversation) => conversation.lastMessage)
  .map((conversation) => {
                const otherPerson =
                  currentUserId ===
                  conversation.sellerId
                    ? conversation.customerName
                    : conversation.sellerName;

                return (
                  <Link
                    key={conversation.id}
                    to={`/messages/${conversation.id}`}
                    className="block rounded-3xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-champagne-400/30 hover:bg-white/[0.035]"
                  >
                    <div className="flex items-center justify-between gap-4">

                      <div className="flex min-w-0 items-center gap-4">

                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-champagne-400/30 bg-champagne-400/10">
                          <Car className="size-5 text-champagne-300" />
                        </div>

                        <div className="min-w-0">

                          <p className="text-[10px] tracking-[0.2em] text-white/35 uppercase">
                            {conversation.carYear}{" "}
                            {conversation.brandName}
                          </p>

                          <h2 className="truncate font-semibold">
                            {conversation.carName}
                          </h2>

                          <p className="mt-1 text-sm text-white/55">
                            {otherPerson}
                          </p>

                          {conversation.lastMessage ? (
                            <p className="mt-2 max-w-xl truncate text-sm text-white/35">
                              {conversation.lastMessage}
                            </p>
                          ) : (
                            <p className="mt-2 text-sm text-white/25">
                              No messages yet
                            </p>
                          )}

                        </div>
                      </div>

                      {conversation.unreadCount >
                        0 && (
                        <span className="flex min-w-6 items-center justify-center rounded-full bg-champagne-300 px-2 py-1 text-xs font-bold text-black">
                          {
                            conversation.unreadCount
                          }
                        </span>
                      )}

                    </div>
                  </Link>
                );
              }
            )}
          </div>
        )}
      </div>
    </main>
  );
}