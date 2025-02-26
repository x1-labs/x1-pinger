# X1 Pinger

## Installation
```bash
npm install
npm start
```

For proper working as a x1-pinger service
```bash
ln -s /home/ubuntu/tachyon/targer/release/solana /bin
systemctl start x1-pinger
systemctl enable x1-pinger
```

## Usage

```bash
curl http://localhost:3334/ping_times | jq
{
  "average": 946,
  "median": 1003,
  "pingTimes": [
    602,
    802,
    602,
    1204,
    1004,
    1406,
    1003
  ]
}
```
