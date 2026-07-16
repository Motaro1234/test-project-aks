# AKS Test App

เว็บแอปทดสอบง่ายๆ สำหรับ deploy บน Azure Kubernetes Service (AKS)
แสดงชื่อ Pod, IP, Node, Namespace และจำนวน request — ใช้ทดสอบเรื่อง
load balancing, rolling update, scaling (HPA), และ health probe ได้จริง

## 1. รันทดสอบในเครื่องก่อน (ไม่บังคับ)

```bash
npm install
npm start
# เปิด http://localhost:3000
```

## 2. Build และ push image ขึ้น Azure Container Registry (ACR)

```bash
# ตั้งชื่อ ACR ของคุณ
ACR_NAME=<your-acr-name>

az acr build --registry $ACR_NAME --image aks-test-app:v1 .
```

หรือ build เองแล้ว push:

```bash
docker build -t $ACR_NAME.azurecr.io/aks-test-app:v1 .
az acr login --name $ACR_NAME
docker push $ACR_NAME.azurecr.io/aks-test-app:v1
```

## 3. เชื่อม AKS กับ ACR (ถ้ายังไม่ได้ทำ)

```bash
az aks update -n <your-aks-cluster> -g <your-resource-group> --attach-acr $ACR_NAME
```

## 4. Deploy ขึ้น AKS

แก้ไฟล์ `k8s-manifest.yaml` บรรทัด `image:` ให้เป็น ACR ของคุณ แล้วรัน:

```bash
kubectl apply -f k8s-manifest.yaml
kubectl get pods -w
kubectl get svc aks-test-app-svc -w   # รอ EXTERNAL-IP
```

พอได้ EXTERNAL-IP แล้วเปิดเบราว์เซอร์เข้าไปดู — รีเฟรชหลายๆ ครั้งจะเห็นว่า
`Pod Hostname` เปลี่ยนไปมาตาม pod ที่รับ request (ทดสอบ load balancing)

## สิ่งที่ใช้ทดสอบได้

- **Load balancing**: รีเฟรชหน้าเว็บซ้ำๆ ดู hostname ที่เปลี่ยนไป
- **Rolling update**: แก้ `APP_VERSION` แล้ว build image ใหม่ (v2), รัน
  `kubectl set image deployment/aks-test-app aks-test-app=$ACR_NAME.azurecr.io/aks-test-app:v2`
  แล้วดู rollout แบบไม่ downtime
- **Scaling / HPA**: ยิง load ด้วย `kubectl run -it load-gen --image=busybox --restart=Never -- /bin/sh -c "while true; do wget -q -O- http://aks-test-app-svc; done"` แล้วดู `kubectl get hpa -w`
- **Self-healing**: ลบ pod ทิ้ง (`kubectl delete pod <name>`) แล้วดูว่า AKS สร้างใหม่ให้อัตโนมัติ
- **Health probes**: `GET /healthz` ใช้เป็น readiness/liveness endpoint

## Cleanup

```bash
kubectl delete -f k8s-manifest.yaml
```
