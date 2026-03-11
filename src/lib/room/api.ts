/**
 * Room API export — currently uses mock implementation.
 * Backend partner: swap `mockRoomApi` with your real API client.
 */
import { mockRoomApi } from "./mock-api";
import type { RoomAPI } from "./types";

export const roomApi: RoomAPI = mockRoomApi;
