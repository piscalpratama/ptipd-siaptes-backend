# Backend SIAPTES — Panduan Deployment

Backend **SIAPTES** UIN SGD (Node.js + Express, REST API for the exam
system). Lihat juga `ptipd-ict-backend`/`ptipd-ict-frontend` untuk sistem
ICT, dan `ptipd-siaptes-frontend` untuk portal peserta.

| Item | Nilai |
|---|---|
| Namespace K8s | `backend-siaptes` |
| Domain | `ict.uinsgd.ac.id/siaptes/api` *(subpath, satu host dengan frontend-ict "/", backend-ict "/api", frontend-siaptes "/siaptes")* |
| Port container | `3100` |
| Port host (VPS) | `3100` |
| NodePort K8s | **30310** |
| Image Docker Hub | `uinsgd/backend-siaptes` |

Tidak ada file storage lokal (tidak ada `multer`/upload) — container ini
sepenuhnya stateless. `GET /health` juga melaporkan `version` (dari
`package.json`) dan `commit` (short SHA, di-inject CI lewat
`--build-arg GIT_COMMIT`).

**Rute dipasang di ROOT oleh Express** (`app.use('/', maintenanceGate, routes)`)
— sengaja begitu supaya kontrak endpoint lama (mis. `/tes-grup/histori` yang
sudah dipanggil BE ICT) tidak berubah. Konsekuensinya: ingress **WAJIB**
strip prefix `/siaptes/api` sebelum request sampai ke pod (lihat
`nginx.ingress.kubernetes.io/rewrite-target` di `k8s/07-ingress.yaml`) — tanpa
itu, semua endpoint 404 karena Express tidak tahu apa-apa soal prefix itu.

---

## Environment (`.env`)

```
PORT=3100
NODE_ENV=production
JWT_SECRET=<random-min-32-char>
DB_HOST=192.168.18.181  DB_PORT=3306  DB_USER=...  DB_PASSWORD=...  DB_NAME=prod_siaptes
ICT_SERVICE_KEY=<harus sama dengan SIAPTES_SERVICE_KEY di .env BE ICT>
CORS_ORIGIN=https://ict.uinsgd.ac.id
SALAM_API_URL=https://api.uinsgd.ac.id/salam/v2/
```

Nilai sensitif dimasukkan ke K8s Secret (lihat `k8s/02-secret.yaml.example`).

---

## Docker (lokal / VPS)

```bash
docker compose pull && docker compose up -d
docker compose logs -f app        # http://localhost:3100/health
```

Dev (hot-reload):
```bash
docker compose -f docker-compose.dev.yml up -d
```

---

## Kubernetes

```bash
cd k8s
kubectl apply -f 00-namespace.yaml -f 01-configmap.yaml
cp 02-secret.yaml.example 02-secret.yaml   # isi nilai asli
kubectl apply -f 02-secret.yaml && rm 02-secret.yaml
kubectl apply -f 04-deployment.yaml -f 05-service.yaml -f 06-hpa.yaml -f 07-ingress.yaml
```

Pull secret Docker Hub (sekali per namespace):
```bash
kubectl create secret docker-registry dockerhub-pull-secret \
  --namespace backend-siaptes \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=<DOCKERHUB_USERNAME> --docker-password=<DOCKERHUB_TOKEN>
```

Rollback manual:
```bash
kubectl rollout undo deployment/backend-siaptes -n backend-siaptes
```

---

## CI/CD (CircleCI)

Push ke branch **`production`** → build multi-arch → push `uinsgd/backend-siaptes` →
deploy K8s → rollback otomatis bila gagal. Push ke `master` → build & push image
tag `:dev` saja (tanpa deploy).

Branch `production` belum ada di repo ini — buat dulu sebelum mengandalkan
auto-deploy:
```bash
git checkout -b production && git push -u origin production
```

### ENV wajib di CircleCI

| Variabel | Isi |
|---|---|
| `DOCKERHUB_USERNAME` | Username personal Docker Hub |
| `DOCKERHUB_TOKEN` | Access Token personal dengan hak push ke org `uinsgd` |
| `DOCKERHUB_ORG` | `uinsgd` |
| `KUBECONFIG_BASE64` | `cat ~/.kube/config \| base64 -w 0` dari k8s-master |
| `BASTION_SSH_KEY` | Private key SSH bastion (base64) |
| `BASTION_USER` | User SSH bastion |
| `BASTION_HOST` | Host/IP bastion |

---

## Catatan penyesuaian sebelum deploy production

- **Ingress host** (`k8s/07-ingress.yaml`) — pastikan `ict.uinsgd.ac.id` sama
  persis dengan host yang dipakai frontend-ict/backend-ict/frontend-siaptes
  di repo lain.
- **`rewrite-target`** di ingress — WAJIB tetap ada selama route Express
  dipasang di root (lihat penjelasan di atas).
- **`CORS_ORIGIN`** di `k8s/01-configmap.yaml` — pastikan sesuai domain
  frontend production yang sebenarnya.
- **`ICT_SERVICE_KEY`** di secret — harus identik dengan `SIAPTES_SERVICE_KEY`
  di `.env`/secret BE ICT, kalau tidak integrasi push peserta dari ICT akan
  gagal auth.
