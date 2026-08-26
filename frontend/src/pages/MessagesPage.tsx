import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, Car, User } from "lucide-react";
import { toast } from "sonner";
import { userApi } from "@/lib/user-auth";

type Message = {
  id: number;
  senderId: number;
  senderName: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

type Conversation = {
  id: number;
  carId: number;
  customerId: number;
  sellerId: number;
  carName: string;
  carYear: number;
  brandName: string;
  customerName: string;
  sellerName: string;
};

export function MessagesPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [conversation, setConversation] =
    useState<Conversation | null>(null);

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadConversation = async () => {
  if (!id) return;

  try {
    const response = await userApi.get(
      `/api/messages/${id}`
    );

    const data = response.data?.data;

    setConversation(data?.conversation ?? null);
    setMessages(data?.messages ?? []);
  } catch (error: any) {
    console.error(
      "LOAD CONVERSATION ERROR:",
      error
    );

    if (error?.response?.status === 401) {
      toast.error("Please sign in again.");
      navigate("/login");
      return;
    }

    toast.error(
      error?.response?.data?.error ??
        "Could not load conversation"
    );
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    loadConversation();
  }, [id]);

  const sendMessage = async () => {
  const message = text.trim();

  if (!message || !id || sending) return;

  setSending(true);

  try {
    const response = await userApi.post(
      `/api/messages/${id}`,
      {
        message,
      }
    );

    const newMessage =
      response.data?.data?.message;

    if (!newMessage) {
      throw new Error(
        "Message could not be sent."
      );
    }

    setMessages((current) => [
      ...current,
      newMessage,
    ]);

    setText("");
  } catch (error: any) {
    console.error(
      "SEND MESSAGE ERROR:",
      error
    );

    toast.error(
      error?.response?.data?.error ??
        error?.message ??
        "Could not send message"
    );
  } finally {
    setSending(false);
  }
};

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08090a] text-white flex items-center justify-center">
        Loading conversation...
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-[#08090a] text-white flex items-center justify-center">
        Conversation not found.
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#08090a] text-white px-6 py-16">
      <div className="mx-auto max-w-4xl">

        {/* BACK */}

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center gap-2 text-xs tracking-[0.18em] uppercase text-white/50 transition hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>

        {/* HEADER */}

        <div className="mb-8">
          <p className="mb-2 text-xs font-bold tracking-[0.25em] text-champagne-300 uppercase">
            Vehicle Enquiry
          </p>

          <h1 className="text-3xl font-bold md:text-4xl">
            Messages
          </h1>
        </div>

        {/* VEHICLE */}

        <div className="mb-5 rounded-3xl border border-white/10 bg-white/[0.025] p-5">
          <div className="flex items-center gap-4">

            <div className="flex size-11 items-center justify-center rounded-xl border border-champagne-400/30 bg-champagne-400/10">
              <Car className="size-5 text-champagne-300" />
            </div>

            <div>
              <p className="text-[10px] tracking-[0.2em] text-white/40 uppercase">
                Vehicle
              </p>

              <h2 className="font-semibold">
                {conversation.carYear}{" "}
                {conversation.brandName}{" "}
                {conversation.carName}
              </h2>
            </div>
          </div>
        </div>

        {/* CONVERSATION */}

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02]">

          {/* PERSON */}

          <div className="flex items-center gap-3 border-b border-white/10 px-6 py-4">
            <div className="flex size-9 items-center justify-center rounded-full bg-white/5">
              <User className="size-4 text-white/60" />
            </div>

            <div>
              <p className="text-xs text-white/40">
                Conversation
              </p>

              <p className="text-sm font-semibold">
                {conversation.sellerName}
              </p>
            </div>
          </div>

          {/* MESSAGES */}

          <div className="min-h-[360px] max-h-[500px] overflow-y-auto p-6">

            {messages.length === 0 ? (
              <div className="flex min-h-[300px] items-center justify-center text-center">
                <div>
                  <p className="font-medium">
                    Start the conversation
                  </p>

                  <p className="mt-2 text-sm text-white/40">
                    Ask the seller a question about this vehicle.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => {

                  const mine =
                    message.senderId ===
                    conversation.customerId;

                  return (
                    <div
                      key={message.id}
                      className={`flex ${
                        mine
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                          mine
                            ? "bg-champagne-300 text-black"
                            : "bg-white/[0.07] text-white"
                        }`}
                      >
                        <p className="text-sm leading-relaxed">
                          {message.message}
                        </p>

                        <p
                          className={`mt-2 text-[10px] ${
                            mine
                              ? "text-black/50"
                              : "text-white/30"
                          }`}
                        >
                          {message.senderName}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SEND */}

          <div className="border-t border-white/10 p-4">
            <div className="flex items-end gap-3">

              <textarea
                value={text}
                onChange={(e) =>
                  setText(e.target.value)
                }
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey
                  ) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Write a message..."
                rows={2}
                maxLength={2000}
                className="min-h-[52px] flex-1 resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-champagne-400/50"
              />

              <button
                type="button"
                onClick={sendMessage}
                disabled={
                  !text.trim() || sending
                }
                className="flex size-12 shrink-0 items-center justify-center rounded-full bg-champagne-300 text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="size-4" />
              </button>

            </div>

            <p className="mt-2 px-1 text-[10px] text-white/30">
              Press Enter to send · Shift + Enter for a new line
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}