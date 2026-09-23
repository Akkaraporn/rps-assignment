# คู่มือติดตั้ง (Deployment Guide)

ติดตั้งระบบทั้งหมดบนเซิร์ฟเวอร์ **Ubuntu 20.04** เครื่องใหม่ด้วย Docker Compose — ทำตามลำดับจากบนลงล่าง ทุกคำสั่งคัดลอกไปวางได้ทันที

ภาพรวม: ติดตั้ง Docker → ดาวน์โหลดโค้ด → ตั้งค่า `.env` → `docker compose up -d --build` → ตรวจสอบ → เปิดเว็บ

> ขั้นตอนในเอกสารนี้ถูกทดสอบจริงบน Ubuntu 20.04.6 LTS (Focal) เครื่องเปล่า ได้ Docker Engine 28.1.1 และ Docker Compose v2.35.1

---

## 1. Machine requirements

| Item | Minimum |
|---|---|
| OS | Ubuntu 20.04 LTS (64-bit) |
| RAM | 2 GB (ขั้นตอน build ใช้หน่วยความจำมากที่สุด) |
| Free disk | 5 GB |
| Network | เชื่อมต่ออินเทอร์เน็ตได้ |
| Port | 80 ว่าง (เปลี่ยนได้ ดูหัวข้อ 4.3) |
| Privileges | user ที่ใช้ `sudo` ได้ |

ระบบเปิดรับการเชื่อมต่อจากภายนอก**เพียง port เดียว** (nginx) ส่วน service อื่นทั้งหมดรวมถึงฐานข้อมูลสื่อสารกันภายใน Docker network เท่านั้น

---

## 2. Install Docker

> ⚠️ **อย่าติดตั้งด้วย `sudo apt install docker.io docker-compose`** — package ของ Ubuntu 20.04 เป็น Docker Compose v1 ที่เก่าเกินไปและใช้ไฟล์ compose ของโปรเจกต์นี้ไม่ได้ ให้ติดตั้งจาก repository ทางการของ Docker ตามขั้นตอนด้านล่าง

### 2.1 เพิ่ม repository ของ Docker

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git openssl

sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

### 2.2 ติดตั้ง Docker Engine และ Compose plugin

```bash
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 2.3 ให้ user ปัจจุบันใช้ Docker ได้โดยไม่ต้อง sudo

```bash
sudo usermod -aG docker $USER
newgrp docker
```

### 2.4 Verify

```bash
docker --version
docker compose version
docker run --rm hello-world
```

ต้องเห็น `Docker Compose version v2.x` ขึ้นไป (มีคำว่า `v2` ไม่ใช่ `docker-compose version 1.x`) และ `hello-world` พิมพ์ `Hello from Docker!`

---

## 3. Get the code

```bash
cd ~
git clone https://github.com/Akkaraporn/rps-assignment rps-assignment
cd rps-assignment
```

คำสั่งทุกข้อต่อจากนี้รันในโฟลเดอร์ `rps-assignment`

---

## 4. Configure `.env`

### 4.1 Create the file

```bash
cp .env.example .env
```

### 4.2 Generate the secrets (required)

มีค่าลับ 3 ตัวที่**ต้อง**ตั้งก่อนเริ่มระบบ คำสั่งด้านล่างสร้างค่าสุ่มและเขียนลง `.env` ให้อัตโนมัติ:

```bash
sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(openssl rand -hex 24)/" .env
sed -i "s/^INTERNAL_TOKEN=.*/INTERNAL_TOKEN=$(openssl rand -hex 32)/" .env
sed -i "s/^COOKIE_SECRET=.*/COOKIE_SECRET=$(openssl rand -hex 32)/" .env
```

ตรวจว่าเขียนลงแล้ว (ต้องเห็นค่ายาว ๆ ไม่ใช่ `change-me`):

```bash
grep -E '^(POSTGRES_PASSWORD|INTERNAL_TOKEN|COOKIE_SECRET)=' .env
```

> ถ้าจะตั้ง database password ให้ใช้**ตัวอักษรและตัวเลขเท่านั้น** — password จะถูกนำไปประกอบเป็น connection URL อักขระอย่าง `@ / : #` จะทำให้เชื่อมต่อไม่ได้

> ⚠️ `POSTGRES_PASSWORD` ถูกใช้**ครั้งเดียว**ตอนสร้าง database ครั้งแรก ถ้าเปลี่ยนภายหลังโดยไม่ล้างข้อมูล ระบบ break the connection (ดูหัวข้อ 9)

### 4.3 Optional settings

| Variable | Default | When to change it |
|---|---|---|
| `WEB_PORT` | `80` | port 80 ถูกใช้อยู่แล้ว เช่นตั้งเป็น `8080` |
| `COOKIE_SECURE` | `false` | ตั้ง `true` เมื่อให้บริการผ่าน HTTPS (หัวข้อ 8) |
| `VITE_REVEAL_DURATION_MS` | `2000` | เวลาแสดง action ของบอท (มิลลิวินาที) |
| `PLAY_MIN_INTERVAL_MS` | `1500` | ระยะห่างขั้นต่ำระหว่างการเล่น — **ต้องน้อยกว่า** `VITE_REVEAL_DURATION_MS` |
| `GUEST_CREATE_LIMIT` | `20` | จำนวนผู้เล่นใหม่ที่สร้างได้ต่อ IP ต่อนาที (เพิ่มถ้าผู้เล่นจำนวนมากใช้ IP เดียวกัน) |
| `MONITOR_PORT` | `3100` | port ของหน้า Uptime Kuma (เข้าได้จากในเครื่องเท่านั้น) |

ตัวแปรกลุ่มสุดท้ายของ `.env.example` ที่ระบุว่า "development-only" ไม่มีผลกับการติดตั้งด้วย Docker ไม่ต้องแก้

---

## 5. Start the stack

```bash
docker compose up -d --build
```

ครั้งแรกใช้เวลาประมาณ 3–10 นาที ขึ้นกับความเร็วเครื่องและอินเทอร์เน็ต (ดาวน์โหลด base image และ build 4 image) ครั้งถัดไปเร็วขึ้นมากเพราะมี cache

ระบบเริ่มเองอัตโนมัติเมื่อเครื่องรีบูตหรือ service ใดล่ม (`restart: unless-stopped`) และ service จะทยอยขึ้นตามลำดับที่ต้องพึ่งพากัน — database พร้อมก่อน แล้วจึง game/user จากนั้น gateway และสุดท้าย nginx

---

## 6. Verify the installation

### 6.1 สถานะ container status

```bash
docker compose ps
```

ต้องเห็นทุก service สถานะ `running` และ `postgres`, `redis`, `game`, `user`, `gateway` มีคำว่า `(healthy)`

### 6.2 log ของ service

```bash
docker compose logs gateway game user | grep -E "successfully started|Subscribed"
```

ต้องเห็น `Nest application successfully started` ครบ 3 บรรทัด และ `Subscribed to rps:high-score:changed` หนึ่งบรรทัด

### 6.3 เรียก API ผ่าน nginx

```bash
curl -s http://localhost/api/session
```

ต้องได้ `{"currentScore":0,"highScore":0}` (ถ้าตั้ง `WEB_PORT` เป็นค่าอื่น ใส่ port ด้วย เช่น `http://localhost:8080/api/session`)

### 6.4 smoke test อัตโนมัติ

```bash
./scripts/smoke-test.sh
```

ตรวจ 23 ข้อ ครอบคลุมการเล่น กติกาคะแนน การจำคะแนน การกันโกง WebSocket และ `/health` ของทุก service — ต้องขึ้น `ผ่านทั้งหมด 23/23`

### 6.5 เปิดเว็บ

เปิด browser ไปที่ `http://<IP หรือ domain ของเซิร์ฟเวอร์>` (ต่อท้าย `:<WEB_PORT>` ถ้าไม่ใช่ 80)

ถ้าเครื่องเปิด firewall `ufw` ไว้ ต้องอนุญาต port ก่อน:

```bash
sudo ufw allow 80/tcp
```

---

## 7. หน้า Monitoring (Uptime Kuma)

ระบบมี Uptime Kuma สำหรับดูสถานะของแต่ละ service หน้าเว็บของมันเปิดเฉพาะจากเครื่องที่ติดตั้ง (`127.0.0.1:3100`) เพราะ **ผู้ที่เปิดหน้านี้เป็นคนแรกจะได้สร้างบัญชี admin**

### 7.1 เข้าหน้า Kuma

จากเครื่องของคุณเอง เปิด SSH tunnel มายังเซิร์ฟเวอร์ (แทน `myuser` และ `192.168.1.50` ด้วยค่าจริง):

```bash
ssh -L 3100:localhost:3100 myuser@192.168.1.50
```

ปล่อย terminal นั้นไว้ แล้วเปิด browser ที่ `http://localhost:3100`

### 7.2 ตั้ง monitor (ทำครั้งเดียว)

1. สร้างบัญชี admin ในหน้าแรก
2. กด **Add New Monitor** แล้วกรอก:
   - Monitor Type: **HTTP(s)**
   - Friendly Name: `gateway`
   - URL: `http://gateway:3000/health`
   - Heartbeat Interval: `20`
   - กด **Save**
3. ทำซ้ำอีกสองครั้งสำหรับ
   - `game` → `http://game:3001/health`
   - `user` → `http://user:3002/health`

ใช้ชื่อ service เป็น URL ได้เพราะ Kuma อยู่ใน Docker network เดียวกัน ไม่ต้องเปิด port ของ service ใดเพิ่ม

ทั้งสามต้องขึ้นสีเขียว หากหยุด Redis (`docker compose stop redis`) จะเห็น `gateway` และ `user` เปลี่ยนเป็นสีแดงภายในราวครึ่งนาที ส่วน `game` ยังเขียวเพราะไม่ได้ใช้ Redis และตัวเกมยังเล่นได้ตามปกติ

---

## 8. HTTPS (optional)

ระบบให้บริการผ่าน HTTP เมื่อต้องการ HTTPS ให้วาง TLS termination ไว้หน้า nginx ของระบบ (เช่น reverse proxy ของเครื่อง, Caddy หรือ load balancer ของ cloud) แล้ว:

1. ตั้ง `COOKIE_SECURE=true` ใน `.env` แล้ว `docker compose up -d`
2. proxy ตัวหน้าต้องส่งต่อ header `Upgrade` และ `Connection` สำหรับ path `/api/ws` (WebSocket) และส่ง `X-Forwarded-For`

---

## 9. Operations

| Task | Command |
|---|---|
| Status | `docker compose ps` |
| Follow logs | `docker compose logs -f` |
| Logs for one service | `docker compose logs -f gateway` |
| Stop (data preserved) | `docker compose down` |
| Start again | `docker compose up -d` |
| Restart one service | `docker compose restart user` |
| Deploy a new version | `git pull && docker compose up -d --build` |
| **Delete the stack and all data** | `docker compose down -v` |

> `down` เฉย ๆ เก็บข้อมูลไว้ใน Docker volume — `down -v` **ลบคะแนนและผู้เล่นทั้งหมดถาวร**

### เปลี่ยนค่าใน `.env` หลังติดตั้ง

- ค่าทั่วไป → แก้ `.env` แล้ว `docker compose up -d` (Compose สร้างเฉพาะ service ที่ค่าเปลี่ยนใหม่ให้)
- `VITE_REVEAL_DURATION_MS` → ค่านี้ฝังอยู่ในไฟล์หน้าเว็บตอน build ต้องใช้ `docker compose up -d --build web`
- `POSTGRES_PASSWORD` → ดูหัวข้อ 10

### สำรองและกู้คืนข้อมูล

```bash
# สำรอง
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > backup.sql

# กู้คืน (ลงฐานข้อมูลที่ว่างอยู่)
docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"' < backup.sql
```

ข้อมูลใน Redis เป็นเพียง cache และตัวนับ rate limit ไม่ต้องสำรอง — ระบบสร้างใหม่จาก PostgreSQL เองเมื่อเริ่มทำงาน

---

## 10. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `docker compose` ขึ้น `unknown command` หรือ `docker-compose` ฟ้องเรื่อง `name` / `condition` | ติดตั้ง Compose v1 จาก apt | ติดตั้งใหม่ตามหัวข้อ 2 แล้วใช้ `docker compose` (มีเว้นวรรค) |
| `permission denied ... docker.sock` | user ยังไม่อยู่ในกลุ่ม docker | ทำหัวข้อ 2.3 แล้ว logout / login ใหม่ |
| `POSTGRES_PASSWORD is required in .env` (หรือ `INTERNAL_TOKEN`, `COOKIE_SECRET`) | ยังไม่ได้สร้าง `.env` หรือค่าว่าง | ทำหัวข้อ 4 ใหม่ |
| `port is already allocated` / `address already in use` | port 80 ถูกโปรแกรมอื่นใช้ | ตั้ง `WEB_PORT=8080` ใน `.env` แล้ว `docker compose up -d` |
| log ของ user มี `password authentication failed` | เปลี่ยน `POSTGRES_PASSWORD` หลังฐานข้อมูลถูกสร้างไปแล้ว | ใส่รหัสผ่านเดิมกลับ หรือล้างข้อมูลด้วย `docker compose down -v` แล้ว `up -d` |
| build หยุดกลางทางด้วย `Killed` หรือ exit code 137 | RAM ไม่พอขณะ build | เพิ่ม swap 2 GB (ด้านล่าง) แล้ว build ใหม่ |
| `docker compose ps` ค้างที่ `(health: starting)` เกินหนึ่งนาที | service ข้างในเริ่มไม่สำเร็จ | `docker compose logs <ชื่อ service>` เพื่อดูสาเหตุ |
| High Score ไม่อัปเดตข้ามหน้าต่าง | WebSocket ถูกตัดโดย proxy ตัวหน้า | ตรวจว่า proxy ส่งต่อ `Upgrade` / `Connection` สำหรับ `/api/ws` (หัวข้อ 8) |
| `./scripts/smoke-test.sh: Permission denied` | ไฟล์ไม่มีสิทธิ์รัน | `chmod +x scripts/smoke-test.sh` |
| เปิดจากเครื่องอื่นไม่ได้ แต่ `curl localhost` ได้ | firewall ปิด port | `sudo ufw allow 80/tcp` หรือเปิด port ใน security group ของ cloud |
| เปิด `http://<server>:3100` ไม่ได้ | ตั้งใจให้เข้าได้จากในเครื่องเท่านั้น | ใช้ SSH tunnel ตามหัวข้อ 7.1 |

เพิ่ม swap (กรณี RAM น้อย):

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

ดู log ทั้งหมดเพื่อหาสาเหตุ:

```bash
docker compose logs --tail=100
```
