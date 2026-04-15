// 山西名人录 - 前端核心逻辑

// Supabase 配置（使用你在 Vercel 配置的环境变量）
const SUPABASE_URL = 'https://ojibgfhavlhsqqnkfcte.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_auyTRPEo0Japh-4ijdS7Dg_hcaFhNeO';

// 注意：上面的 SUPABASE_ANON_KEY 需要替换成你实际的 key
// 因为这是前端代码，实际部署时建议通过环境变量注入

// 初始化 Supabase 客户端
let supabaseClient = null;

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
    // 搜索按钮
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const keyword = document.getElementById('searchKeyword')?.value || '';
            const dynasty = document.getElementById('searchDynasty')?.value || '';
            const county = document.getElementById('searchCounty')?.value || '';
            searchFigures(keyword, dynasty, county);
        });
    }

    // 添加名人表单
    const addForm = document.getElementById('addPersonForm');
    if (addForm) {
        addForm.addEventListener('submit', handleAddPerson);
    }

    // 补充信息表单
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
            // 跳转到详情页
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
                <div class="info-label">籍贯</div>
                <div class="info-value">${person.county || '待考'}</div>
            </div>
            <div class="info-row">
                <div class="info-label">生卒年</div>
                <div class="info-value">${formatBirthYear(person.birth_year, person.death_year)}</div>
            </div>
            <div class="info-row">
                <div class="info-label">主要事迹</div>
                <div class="info-value">${escapeHtml(person.main_achievement || '暂无')}</div>
            </div>
        </div>
        <div id="aiContent"></div>
    `;

    // 设置页面标题
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
        const response = await fetch('/api/contribute.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ personId, fieldName, newValue })
        });

        const result = await response.json();

        if (result.success) {
            showMessage('感谢您的补充！信息已提交审核。', 'success');
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

// 工具函数：转义 HTML
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// 格式化生卒年
function formatBirthYear(birth, death) {
    if (!birth && !death) return '不详';
    if (birth && !death) return `公元${birth}年`;
    if (!birth && death) return `?-公元${death}年`;
    return `公元${birth}年 - ${death}年`;
}

// 显示提示消息
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

// 如果在详情页，加载详情
if (window.location.pathname.includes('person.html')) {
    loadPersonDetail();
}
// ========== 山西地图功能 ==========

// 初始化山西地图
async function initShanxiMap() {
    const mapContainer = document.getElementById('shanxi-map');
    if (!mapContainer) return;

    // 创建地图（山西中心坐标：112.5°E, 37.8°N）
    const map = L.map('shanxi-map').setView([37.8, 112.5], 7);

    // 添加免费底图（CartoDB 浅色风格）
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
        minZoom: 6
    }).addTo(map);

    try {
        // 加载 GeoJSON 数据
        const response = await fetch('/shanxi.geojson');
        const geojsonData = await response.json();

        // 定义城市名称映射（GeoJSON 里的字段名可能是 'name' 或 'NAME'）
        function getCityName(feature) {
            return feature.properties.name || feature.properties.NAME || feature.properties.市;
        }

        // 添加地图图层
        const geojsonLayer = L.geoJSON(geojsonData, {
            style: {
                color: '#8b1a1a',      // 边框颜色（山西红）
                weight: 2,
                fillColor: '#d4a373',   // 填充色
                fillOpacity: 0.4
            },
            onEachFeature: function (feature, layer) {
                const cityName = getCityName(feature);
                
                // 鼠标悬停高亮
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
                
                // 点击事件：搜索该地区的名人
                layer.on('click', async function () {
                    showMessage(`正在加载 ${cityName} 的名人...`, 'success');
                    await searchByRegion(cityName);
                    // 地图高亮选中的区域
                    layer.setStyle({
                        fillColor: '#8b1a1a',
                        fillOpacity: 0.8
                    });
                    // 3秒后恢复颜色
                    setTimeout(() => {
                        geojsonLayer.resetStyle(layer);
                    }, 2000);
                });
            }
        }).addTo(map);

        // 添加比例尺
        L.control.scale({ metric: true, imperial: false }).addTo(map);

    } catch (error) {
        console.error('地图加载失败:', error);
        mapContainer.innerHTML = '<div style="padding: 2rem; text-align: center; color: #666;">地图加载失败，请刷新重试</div>';
    }
}

// 根据地区搜索名人（支持市、县名称模糊匹配）
async function searchByRegion(regionName) {
    const grid = document.getElementById('figuresGrid');
    if (!grid) return;

    grid.innerHTML = '<div class="loading">搜索中...</div>';

    try {
        // 调用搜索 API，按地区筛选
        const response = await fetch(`/api/search?county=${encodeURIComponent(regionName)}`);
        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
            renderFigures(result.data);
            // 滚动到列表区域
            grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            grid.innerHTML = `<div class="loading">📌 ${regionName} 暂无名录记录，快去添加第一位吧！</div>`;
        }
    } catch (error) {
        console.error('搜索失败:', error);
        grid.innerHTML = '<div class="loading">搜索失败，请重试</div>';
    }
}

// 页面加载时初始化地图
if (document.getElementById('shanxi-map')) {
    // 等待 DOM 完全加载
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initShanxiMap);
    } else {
        initShanxiMap();
    }
}
