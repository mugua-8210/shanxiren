// 山西名人录 - 前端核心逻辑

// Supabase 配置
const SUPABASE_URL = 'https://ojibgfhavlhsqqnkfcte.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_auyTRPEo0Japh-4ijdS7Dg_hcaFhNeO';

// 初始化 Supabase 客户端
let supabaseClient = null;

// ========== 山西全境市县映射表 ==========
const cityToCounties = {
    "太原市": ["小店区", "迎泽区", "杏花岭区", "尖草坪区", "万柏林区", "晋源区", "清徐县", "阳曲县", "娄烦县", "古交市"],
    "运城市": ["盐湖区", "永济市", "河津市", "芮城县", "临猗县", "万荣县", "新绛县", "稷山县", "闻喜县", "夏县", "绛县", "平陆县", "垣曲县"],
    "临汾市": ["尧都区", "侯马市", "霍州市", "曲沃县", "翼城县", "襄汾县", "洪洞县", "古县", "安泽县", "浮山县", "吉县", "乡宁县", "大宁县", "隰县", "永和县", "蒲县", "汾西县"],
    "大同市": ["平城区", "云冈区", "新荣区", "云州区", "阳高县", "天镇县", "广灵县", "灵丘县", "浑源县", "左云县"],
    "长治市": ["潞州区", "上党区", "屯留区", "潞城区", "襄垣县", "平顺县", "黎城县", "壶关县", "长子县", "武乡县", "沁县", "沁源县"],
    "晋城市": ["城区", "高平市", "泽州县", "沁水县", "阳城县", "陵川县"],
    "忻州市": ["忻府区", "原平市", "定襄县", "五台县", "代县", "繁峙县", "宁武县", "静乐县", "神池县", "五寨县", "岢岚县", "河曲县", "保德县", "偏关县"],
    "晋中市": ["榆次区", "太谷区", "介休市", "榆社县", "左权县", "和顺县", "昔阳县", "寿阳县", "祁县", "平遥县", "灵石县"],
    "吕梁市": ["离石区", "孝义市", "汾阳市", "文水县", "交城县", "兴县", "临县", "柳林县", "石楼县", "岚县", "方山县", "中阳县", "交口县"],
    "阳泉市": ["城区", "矿区", "郊区", "平定县", "盂县"],
    "朔州市": ["朔城区", "平鲁区", "怀仁市", "山阴县", "应县", "右玉县"]
};

// 县级 → 市级 反向映射
const countyToCity = {};
for (const [city, counties] of Object.entries(cityToCounties)) {
    for (const county of counties) {
        countyToCity[county] = city;
    }
}

// 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', () => {
    initSupabase();
    bindEvents();
    loadFigures();
});

// 初始化 Supabase
async function initSupabase() {
    if (typeof supabase === 'undefined') {
        console.error('Supabase 库未加载');
        return;
    }
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// 绑定页面事件
function bindEvents() {
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const keyword = document.getElementById('searchKeyword')?.value || '';
            const dynasty = document.getElementById('searchDynasty')?.value || '';
            const county = document.getElementById('searchCounty')?.value || '';
            searchFigures(keyword, dynasty, county);
        });
    }

    const addForm = document.getElementById('addPersonForm');
    if (addForm) {
        addForm.addEventListener('submit', handleAddPerson);
    }

    const contributeForm = document.getElementById('contributeForm');
    if (contributeForm) {
        contributeForm.addEventListener('submit', handleContribute);
    }
}

// 加载名人列表
async function loadFigures() {
    const grid = document.getElementById('figuresGrid');
    if (!grid) return;

    grid.innerHTML = '<div class="loading">加载中...</div>';

    try {
        const response = await fetch('/api/search?all=true');
        const result = await response.json();

        if (result.success && result.data) {
            renderFigures(result.data);
        } else {
            grid.innerHTML = '<div class="loading">暂无数据，快去添加第一位山西名人吧！</div>';
        }
    } catch (error) {
        console.error('加载失败:', error);
        grid.innerHTML = '<div class="loading error">加载失败，请刷新重试</div>';
    }
}

// 渲染名人卡片
function renderFigures(figures) {
    const grid = document.getElementById('figuresGrid');
    if (!grid) return;

    if (!figures || figures.length === 0) {
        grid.innerHTML = '<div class="loading">未找到相关名人</div>';
        return;
    }

    grid.innerHTML = figures.map(figure => `
        <div class="card" onclick="goToDetail(${figure.id})">
            <h3>${escapeHtml(figure.name)}</h3>
            <div class="dynasty">${figure.dynasty || '朝代待考'} · ${figure.county || '籍贯待考'}</div>
            <div class="achievement">${escapeHtml(figure.main_achievement || '暂无事迹记录')}</div>
        </div>
    `).join('');
}

// 搜索名人
async function searchFigures(keyword, dynasty, county) {
    const grid = document.getElementById('figuresGrid');
    if (!grid) return;

    grid.innerHTML = '<div class="loading">搜索中...</div>';

    try {
        const params = new URLSearchParams();
        if (keyword) params.append('keyword', keyword);
        if (dynasty) params.append('dynasty', dynasty);
        if (county) params.append('county', county);

        const response = await fetch(`/api/search?${params.toString()}`);
        const result = await response.json();

        if (result.success) {
            renderFigures(result.data);
        } else {
            grid.innerHTML = '<div class="loading">搜索失败，请重试</div>';
        }
    } catch (error) {
        console.error('搜索失败:', error);
        grid.innerHTML = '<div class="loading">搜索失败，请重试</div>';
    }
}

// 处理添加名人
async function handleAddPerson(e) {
    e.preventDefault();

    const formData = {
        name: document.getElementById('name')?.value,
        dynasty: document.getElementById('dynasty')?.value,
        city: document.getElementById('city')?.value,
        county: document.getElementById('county')?.value,
        birth_year: document.getElementById('birth_year')?.value || null,
        death_year: document.getElementById('death_year')?.value || null,
        main_achievement: document.getElementById('main_achievement')?.value
    };

    const submitBtn = e.target.querySelector('.btn-submit');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '提交中...';
    submitBtn.disabled = true;

    try {
        const response = await fetch('/api/add-person', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.success) {
            showMessage('添加成功！AI 正在生成详细介绍，请稍后查看。', 'success');
            e.target.reset();
            setTimeout(() => {
                window.location.href = `/person.html?id=${result.data.id}`;
            }, 1500);
        } else {
            showMessage(result.error || '添加失败，请重试', 'error');
        }
    } catch (error) {
        console.error('添加失败:', error);
        showMessage('网络错误，请重试', 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// 加载名人详情
async function loadPersonDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const personId = urlParams.get('id');

    if (!personId) {
        document.getElementById('detailContent').innerHTML = '<div class="loading">未指定名人ID</div>';
        return;
    }

    try {
        const response = await fetch(`/api/get-person?id=${personId}`);
        const result = await response.json();

        if (result.success && result.data) {
            renderPersonDetail(result.data);
            loadAIContent(personId);
        } else {
            document.getElementById('detailContent').innerHTML = '<div class="loading">未找到该名人信息</div>';
        }
    } catch (error) {
        console.error('加载详情失败:', error);
        document.getElementById('detailContent').innerHTML = '<div class="loading">加载失败，请刷新重试</div>';
    }
}

// 格式化主要事迹（把换行符转成 <br>）
function formatMainAchievement(text) {
    if (!text) return '暂无';
    let escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return escaped.replace(/\n/g, '<br>');
}

// 渲染名人详情
function renderPersonDetail(person) {
    const container = document.getElementById('detailContent');
    if (!container) return;

    container.innerHTML = `
        <div class="detail-card">
            <h2>${escapeHtml(person.name)}</h2>
            <div class="info-row">
                <div class="info-label">朝代</div>
                <div class="info-value">${person.dynasty || '待考'}</div>
            </div>
            <div class="info-row">
                <div class="info-label">所属市</div>
                <div class="info-value">${person.city || '待考'}</div>
            </div>
            <div class="info-row">
                <div class="info-label">籍贯</div>
                <div class="info-value">${person.county || '待考'}</div>
            </div>
            <div class="info-row">
                <div class="info-label">生卒年</div>
                <div class="info-value">${formatBirthYear(person.birth_year, person.death_year)}</div>
            </div>
            <div class="info-row">
                <div class="info-label">主要事迹</div>
                <div class="info-value">${formatMainAchievement(person.main_achievement)}</div>
            </div>
        </div>
        <div id="aiContent"></div>
    `;

    document.title = `${person.name} - 山西名人录`;
}

// 加载 AI 生成的内容
async function loadAIContent(personId) {
    const aiContainer = document.getElementById('aiContent');
    if (!aiContainer) return;

    aiContainer.innerHTML = '<div class="loading">正在加载 AI 介绍...</div>';

    try {
        const response = await fetch(`/api/generate-ai?id=${personId}`);
        const result = await response.json();

        if (result.success && result.data) {
            let aiHtml = '';
            if (result.data.structured) {
                aiHtml += `
                    <div class="ai-section">
                        <h3>📚 详细资料</h3>
                        <p>${escapeHtml(result.data.structured)}</p>
                    </div>
                `;
            }
            if (result.data.long_article) {
                aiHtml += `
                    <div class="ai-section">
                        <h3>📖 人物生平</h3>
                        <p>${escapeHtml(result.data.long_article)}</p>
                    </div>
                `;
            }
            aiContainer.innerHTML = aiHtml || '<div class="ai-section">暂无 AI 介绍，请稍后刷新</div>';
        } else {
            aiContainer.innerHTML = '<div class="ai-section">AI 介绍生成中，请稍后刷新页面查看...</div>';
        }
    } catch (error) {
        console.error('加载 AI 内容失败:', error);
        aiContainer.innerHTML = '<div class="ai-section">AI 介绍加载失败，请刷新重试</div>';
    }
}

// 处理网友补充
async function handleContribute(e) {
    e.preventDefault();

    const urlParams = new URLSearchParams(window.location.search);
    const personId = urlParams.get('id');
    const fieldName = document.getElementById('fieldName')?.value;
    const newValue = document.getElementById('newValue')?.value;

    const submitBtn = e.target.querySelector('.btn-submit');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '提交中...';
    submitBtn.disabled = true;

    try {
        const response = await fetch('/api/contribute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ personId, fieldName, newValue })
        });

        const result = await response.json();

        if (result.success) {
            showMessage('补充信息已提交，等待管理员审核。', 'success');
            e.target.reset();
        } else {
            showMessage(result.error || '提交失败，请重试', 'error');
        }
    } catch (error) {
        console.error('提交失败:', error);
        showMessage('网络错误，请重试', 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// 跳转到详情页
function goToDetail(id) {
    window.location.href = `/person.html?id=${id}`;
}

// 工具函数
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatBirthYear(birth, death) {
    if (!birth && !death) return '不详';
    if (birth && !death) return `公元${birth}年`;
    if (!birth && death) return `?-公元${death}年`;
    return `公元${birth}年 - ${death}年`;
}

function showMessage(msg, type) {
    const container = document.querySelector('.container');
    if (!container) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${type}`;
    msgDiv.textContent = msg;

    container.insertBefore(msgDiv, container.firstChild);

    setTimeout(() => {
        msgDiv.remove();
    }, 3000);
}

// ========== 山西地图功能 ==========

async function searchByRegion(regionName) {
    const grid = document.getElementById('figuresGrid');
    if (!grid) return;

    grid.innerHTML = '<div class="loading">搜索中...</div>';

    try {
        let searchCity = null;
        let searchCounty = null;
        
        if (cityToCounties[regionName]) {
            searchCity = regionName;
        } else if (countyToCity[regionName]) {
            searchCounty = regionName;
        } else {
            searchCounty = regionName;
        }
        
        let url;
        if (searchCounty) {
            url = `/api/search?county_exact=${encodeURIComponent(searchCounty)}`;
        } else {
            url = `/api/search?city_exact=${encodeURIComponent(searchCity)}`;
        }
        
        const response = await fetch(url);
        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
            renderFigures(result.data);
            grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
            showMessage(`找到 ${result.data.length} 位${searchCounty || searchCity}的名人`, 'success');
        } else {
            grid.innerHTML = `<div class="loading">📌 ${regionName} 暂无名录记录，快去添加第一位吧！</div>`;
        }
    } catch (error) {
        console.error('搜索失败:', error);
        grid.innerHTML = '<div class="loading">搜索失败，请重试</div>';
    }
}

async function initShanxiMap() {
    const mapContainer = document.getElementById('shanxi-map');
    if (!mapContainer) return;

    const map = L.map('shanxi-map').setView([37.8, 112.5], 7);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
        minZoom: 6
    }).addTo(map);

    try {
        const response = await fetch('/shanxi.geojson');
        const geojsonData = await response.json();

        function getCityName(feature) {
            return feature.properties.name || feature.properties.NAME || feature.properties.市;
        }

        const geojsonLayer = L.geoJSON(geojsonData, {
            style: {
                color: '#8b1a1a',
                weight: 2,
                fillColor: '#d4a373',
                fillOpacity: 0.4
            },
            onEachFeature: function (feature, layer) {
                const cityName = getCityName(feature);
                
                layer.on('mouseover', function () {
                    layer.setStyle({
                        fillColor: '#e07a5f',
                        fillOpacity: 0.7,
                        weight: 3
                    });
                    layer.bindTooltip(cityName, { sticky: true }).openTooltip();
                });
                
                layer.on('mouseout', function () {
                    geojsonLayer.resetStyle(layer);
                    layer.closeTooltip();
                });
                
                layer.on('click', async function () {
                    showMessage(`正在加载 ${cityName} 的名人...`, 'success');
                    await searchByRegion(cityName);
                    layer.setStyle({
                        fillColor: '#8b1a1a',
                        fillOpacity: 0.8
                    });
                    setTimeout(() => {
                        geojsonLayer.resetStyle(layer);
                    }, 2000);
                });
            }
        }).addTo(map);

        L.control.scale({ metric: true, imperial: false }).addTo(map);

    } catch (error) {
        console.error('地图加载失败:', error);
        mapContainer.innerHTML = '<div style="padding: 2rem; text-align: center; color: #666;">地图加载失败，请刷新重试</div>';
    }
}

// 页面初始化
if (window.location.pathname.includes('person.html')) {
    loadPersonDetail();
}

if (document.getElementById('shanxi-map')) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initShanxiMap);
    } else {
        initShanxiMap();
    }
}
