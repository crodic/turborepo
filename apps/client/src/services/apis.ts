import { http } from "@/lib/http";

export const getClientToken = async () => {
  const { data } = await http.get<{
    accessToken: string;
    refreshToken: string;
  }>(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tokens`);
  return data;
};
