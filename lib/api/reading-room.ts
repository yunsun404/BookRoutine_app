import { api } from './client'; // ebooks.ts와 동일한 axios 인스턴스 재사용

export async function startReadingRoom(groupId: string, groupName: string) {
  const { data } = await api.post('/reading-room/start', {
    group_id: groupId,
    group_name: groupName,
  });
  return data; // { create: {...room_id 포함...}, enter: {...} }
}