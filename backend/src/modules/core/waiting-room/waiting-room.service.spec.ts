import { WaitingRoomService } from './waiting-room.service';

describe('WaitingRoomService Unit Test', () => {
  let service: WaitingRoomService;

  beforeEach(() => {
    service = new WaitingRoomService();
    // Set parameter kecil untuk kemudahan pengujian
    service.maxConcurrentActive = 3;
    service.maxRpsThreshold = 50;
    service.forceEnabled = false;
  });

  it('1. Pengguna awal harus langsung ADMITTED ketika kuota masih tersedia', () => {
    const user1 = service.getOrCreateQueue('token-user-1', '127.0.0.1');
    const user2 = service.getOrCreateQueue('token-user-2', '127.0.0.1');
    const user3 = service.getOrCreateQueue('token-user-3', '127.0.0.1');

    expect(user1.status).toBe('ADMITTED');
    expect(user2.status).toBe('ADMITTED');
    expect(user3.status).toBe('ADMITTED');
    expect(service.isAdmitted('token-user-1')).toBe(true);
    expect(service.isAdmitted('token-user-2')).toBe(true);
    expect(service.isAdmitted('token-user-3')).toBe(true);
  });

  it('2. Pengguna ke-4 harus masuk ke antrean (QUEUED) saat kapasitas penuh', () => {
    service.getOrCreateQueue('user-1', '127.0.0.1');
    service.getOrCreateQueue('user-2', '127.0.0.1');
    service.getOrCreateQueue('user-3', '127.0.0.1');

    const user4 = service.getOrCreateQueue('user-4', '127.0.0.1');
    expect(user4.status).toBe('QUEUED');
    expect(user4.position).toBe(1);
    expect(service.isAdmitted('user-4')).toBe(false);

    const user5 = service.getOrCreateQueue('user-5', '127.0.0.1');
    expect(user5.status).toBe('QUEUED');
    expect(user5.position).toBe(2);
  });

  it('3. Mode darurat / forceEnabled harus otomatis mengalihkan semua pengguna baru ke antrean', () => {
    service.forceEnabled = true;
    const user = service.getOrCreateQueue('user-force', '127.0.0.1');
    expect(user.status).toBe('QUEUED');
    expect(service.isTrafficCritical()).toBe(true);
  });
});
