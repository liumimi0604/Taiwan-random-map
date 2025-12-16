// 初始化地圖
const map = L.map("map").setView([23.7, 121], 7);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19
}).addTo(map);

let currentLayer = null;
let currentPolygon = null;
let marker = null;

// 讀取並顯示縣市 GeoJSON
async function loadCity(city) {
    if (!city) return;

    randomBtn.disabled = true;   // 載入中先鎖

    const res = await fetch(`geojson/${city}.json`);
    const data = await res.json();

    if (currentLayer) map.removeLayer(currentLayer);

    currentLayer = L.geoJSON(data, {
    style: {
        color: "#333",
        weight: 1.5, 
        fillOpacity: 0  
    }
}).addTo(map);
    currentPolygon = data.features[0].geometry;

    map.fitBounds(currentLayer.getBounds());

    randomBtn.disabled = false;  // ✅ 載完才開
}

// 取得多邊形內隨機點
function getRandomPointInside(poly) {
    let pt;
    const bbox = turf.bbox(poly);

    do {
        pt = turf.randomPoint(1, { bbox }).features[0];
    } while (!turf.booleanPointInPolygon(pt, poly));

    return pt;
}

// 顯示 marker
function dropMarker(lat, lng) {
    if (marker) map.removeLayer(marker);

    const icon = L.divIcon({
    html: `<div class="marker-dot"></div>`,
    className: 'custom-marker',   // ⭐ 關鍵
    iconSize: [16, 16],
    iconAnchor: [8, 8]
    });

    marker = L.marker([lat, lng], { icon }).addTo(map);
}

// 🔽 當縣市選單變更
document.getElementById("citySelect").addEventListener("change", (e) => {
    loadCity(e.target.value);
});

// 🔽 隨機按鈕
const randomBtn = document.getElementById("randomBtn");
document.getElementById("randomBtn").addEventListener("click", async () => {

    const dice = document.getElementById("dice");
    dice.classList.remove("spin");
    void dice.offsetWidth;
    dice.classList.add("spin");

    const citySelect = document.getElementById("citySelect");

    if (!citySelect.value) {
        alert("請先選擇縣市");
        return;
    }

    const pt = getRandomPointInside(currentPolygon);
    const [lng, lat] = pt.geometry.coordinates;

    dropMarker(lat, lng);
    map.flyTo([lat, lng], 15);

    // 顯示查詢中
    const addressBox = document.getElementById("addressBox");
    addressBox.innerText = "📍 查詢地址中…";

    // ⭐ 現在可以正常 await
    const address = await reverseGeocode(lat, lng);

    if (address) {
        addressBox.innerText = `📍 ${address}`;
    } else {
        addressBox.innerText = "📍 無法取得地址";
    }
});


async function reverseGeocode(lat, lng) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;

    const res = await fetch(url, {
        headers: {
            "Accept": "application/json"
        }
    });

    if (!res.ok) return null;

    const data = await res.json();
    const addr = data.address;
    if (!addr) return null;

    // 台灣地址順序組合
    const parts = [
        addr.city || addr.county || "",
        addr.neighbourhood || "",
        addr.suburb || addr.town || "",
        addr.village || "",
        addr.road || "",
        addr.house_number ? `${addr.house_number}號` : ""
    ];

    // 去掉空值後組合
    return parts.filter(Boolean).join("");
}

