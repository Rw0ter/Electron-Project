<template>
    <div class="app-shell" :class="{ 'app-enter': isReady }">
        <header class="topbar">
            <div class="brand">
                <div class="brand-mark">R</div>
                <div>
                    <div class="brand-title">信聊 · dgitc</div>
                    <div class="brand-sub">即时消息 · 简约工作流</div>
                </div>
            </div>
            <div class="topbar-center">
                <div class="status-pill">{{ statusText }}</div>
            </div>
            <div class="topbar-right">
                <div class="user-card-wrap">
                    <div
                        class="user-card"
                        @mouseenter="showProfile"
                        @mouseleave="scheduleHideProfile"
                    >
                        <div
                            class="user-avatar user-avatar-trigger"
                            @mouseenter="showProfile"
                        >
                            {{ initials }}
                        </div>
                        <div class="user-meta">
                            <div class="user-name">{{ displayName }}</div>
                            <div class="user-id">UID {{ auth.uid || '---' }}</div>
                        </div>
                    </div>
                    <div
                        class="profile-popover"
                        :class="{ 'is-visible': isProfileVisible }"
                        @mouseenter="showProfile"
                        @mouseleave="hideProfile"
                    >
                        <div class="profile-head">
                            <div class="profile-avatar">{{ initials }}</div>
                            <div class="profile-meta">
                                <div class="profile-name">{{ displayName }}</div>
                                <div class="profile-uid">UID {{ auth.uid || '---' }}</div>
                                <div class="profile-signature">{{ signature }}</div>
                                <div class="profile-details">
                                    <div class="profile-detail">性别：{{ auth.gender || '未设置' }}</div>
                                    <div class="profile-detail">生日：{{ auth.birthday || '未设置' }}</div>
                                    <div class="profile-detail">
                                        地区：{{ auth.country || '未设置' }}{{ auth.province ? ` / ${auth.province}` : '' }}{{ auth.region ? ` / ${auth.region}` : '' }}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="profile-actions">
                            <button class="profile-btn" type="button" @click="openEditProfile">编辑资料</button>
                            <button class="profile-btn ghost" type="button" @click="handleLogout">
                                退出登录
                            </button>
                        </div>
                    </div>
                </div>
                <div class="window-controls">
                    <button class="wc-btn" @click="handleMin" title="最小化">
                        <span class="wc-icon">&#xE921;</span>
                    </button>
                    <button class="wc-btn" @click="handleMax" title="最大化">
                        <span class="wc-icon">&#xE922;</span>
                    </button>
                    <button class="wc-btn close" @click="handleClose" title="关闭">
                        <span class="wc-icon">&#xE8BB;</span>
                    </button>
                </div>
            </div>
        </header>

        <main class="layout">
            <aside class="sidebar">
                <div class="search">
                    <div class="serach_input_box">
                        <input v-model="searchText"  class="serach_input" type="text" placeholder="搜索联系人或群组" />
                        <div class="add_friend_icon" @click="openFoundFriend">+</div>
                    </div>
                    
                    <div class="search-hint">好友 {{ filteredFriends.length }}</div>
                </div>
                <div class="list">
                    <div class="section-title">私聊列表</div>
                    <button
                        v-for="friend in filteredFriends"
                        :key="friend.uid"
                        class="list-item"
                        :class="{ active: activeFriend?.uid === friend.uid }"
                        @click="selectFriend(friend)"
                    >
                        <div class="avatar">{{ friend.username?.slice(0, 2).toUpperCase() }}</div>
                        <div class="list-meta">
                            <div class="list-name">{{ friend.username }}</div>
                            <div class="list-sub">UID {{ friend.uid }}</div>
                        </div>
                    </button>
                    <div v-if="!filteredFriends.length" class="empty-state">
                        暂无好友，请先添加好友。
                    </div>
                </div>
            </aside>

            <section class="chat">
                <div class="chat-header">
                    <div>
                        <div class="chat-title">
                            {{ activeFriend?.username || '选择一个联系人' }}
                        </div>
                        <div class="chat-sub">
                            {{ activeFriend ? `私聊 · UID ${activeFriend.uid}` : '等待选择聊天对象' }}
                        </div>
                    </div>
                    <div class="chat-actions">
                        <span class="chip">private</span>
                        <span class="chip" :class="{ offline: !activeFriendOnline }">
                            {{ activeFriendOnline ? 'online' : 'offline' }}
                        </span>
                    </div>
                </div>

                <div class="chat-body" ref="chatBodyRef">
                    <div v-if="loading" class="loading">加载中...</div>
                    <div v-else-if="!messages.length" class="empty-chat">
                        还没有聊天记录，打个招呼吧。
                    </div>
                    <div v-else class="bubble-list">
                        <div
                            v-for="msg in messages"
                            :key="msg.id"
                            class="bubble"
                            :class="{ self: msg.senderUid === auth.uid }"
                        >
                            <div class="bubble-name">
                                {{ msg.senderUid === auth.uid ? displayName : activeFriend?.username }}
                            </div>
                            <div class="bubble-text">{{ renderMessage(msg) }}</div>
                            <div class="bubble-time">{{ formatTime(msg.createdAt) }}</div>
                        </div>
                    </div>
                </div>

                <div class="composer">
                    <textarea
                        v-model="draft"
                        placeholder="输入消息，Enter 发送，Shift+Enter 换行"
                        @keydown.enter.exact.prevent="sendMessage"
                        @keydown.enter.shift.stop
                    ></textarea>
                    <button class="send-btn" :disabled="!canSend" @click="sendMessage">
                        发送
                    </button>
                </div>
            </section>
        </main>
        <div v-if="isEditOpen" class="profile-modal">
            <div class="profile-modal__backdrop" @click="closeEditProfile"></div>
            <div class="profile-modal__panel">
                <div class="profile-modal__header">
                    <div class="profile-modal__title">编辑资料</div>
                    <button class="profile-modal__close" type="button" @click="closeEditProfile">×</button>
                </div>
                <div class="profile-modal__body">
                    <div class="profile-modal__avatar">{{ initials }}</div>

                    <label class="profile-field">
                        <span class="profile-field__label">昵称</span>
                        <div class="profile-field__control">
                            <input
                                v-model.trim="editForm.nickname"
                                type="text"
                                maxlength="36"
                                placeholder="请输入昵称"
                            />
                            <span class="profile-field__count">{{ nicknameCount }}/36</span>
                        </div>
                    </label>

                    <label class="profile-field">
                        <span class="profile-field__label">个签</span>
                        <div class="profile-field__control">
                            <input
                                v-model.trim="editForm.signature"
                                type="text"
                                maxlength="80"
                                placeholder="编辑个签，展示我的独特态度"
                            />
                            <span class="profile-field__count">{{ signatureCount }}/80</span>
                        </div>
                    </label>

                    <label class="profile-field">
                        <span class="profile-field__label">性别</span>
                        <select v-model="editForm.gender">
                            <option value="">请选择</option>
                            <option value="男">男</option>
                            <option value="女">女</option>
                            <option value="保密">保密</option>
                        </select>
                    </label>

                    <label class="profile-field">
                        <span class="profile-field__label">生日</span>
                        <input v-model="editForm.birthday" type="date" />
                    </label>

                    <label class="profile-field">
                        <span class="profile-field__label">国家</span>
                        <select v-model="editForm.country">
                            <option value="">请选择</option>
                            <option value="中国">中国</option>
                            <option value="美国">美国</option>
                            <option value="日本">日本</option>
                            <option value="其他">其他</option>
                        </select>
                    </label>

                    <div class="profile-field profile-field--split">
                        <label>
                            <span class="profile-field__label">省份</span>
                            <select v-model="editForm.province">
                                <option value="">请选择</option>
                                <option value="北京">北京</option>
                                <option value="上海">上海</option>
                                <option value="广东">广东</option>
                                <option value="浙江">浙江</option>
                                <option value="其他">其他</option>
                            </select>
                        </label>
                        <label>
                            <span class="profile-field__label">地区</span>
                            <select v-model="editForm.region">
                                <option value="">请选择</option>
                                <option value="华北">华北</option>
                                <option value="华东">华东</option>
                                <option value="华南">华南</option>
                                <option value="西南">西南</option>
                                <option value="其他">其他</option>
                            </select>
                        </label>
                    </div>
                </div>
                <div class="profile-modal__footer">
                    <button class="profile-btn" type="button" @click="saveProfile">保存</button>
                    <button class="profile-btn ghost" type="button" @click="closeEditProfile">取消</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, nextTick } from 'vue';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';
const NOTIFY_SOUND_URL = `${API_BASE}/resource/messagenotify.wav`;

const auth = ref({
    token: '',
    uid: null,
    username: '',
    nickname: '',
    signature: '',
    gender: '',
    birthday: '',
    country: '',
    province: '',
    region: ''
});
const isReady = ref(false);
const isProfileVisible = ref(false);
const isEditOpen = ref(false);
const friends = ref([]);
const activeFriend = ref(null);
const messages = ref([]);
const chatBodyRef = ref(null);
const draft = ref('');
const loading = ref(false);
const searchText = ref('');
const statusText = ref('在线');
const pollTimers = {
    friends: null,
    messages: null,
    profile: null
};
const lastFriendSignature = ref('');
const lastMessageSignature = ref('');
const lastNotifiedMessageId = ref('');

const handleMin = () => window.electronAPI?.windowMin?.();
const handleMax = () => window.electronAPI?.windowMax?.();
const handleClose = () => window.electronAPI?.windowClose?.();
const openFoundFriend = () => window.electronAPI?.openFoundFriend?.();
let profileHideTimer = null;
const editForm = ref({
    nickname: '',
    signature: '',
    gender: '',
    birthday: '',
    country: '',
    province: '',
    region: ''
});

const handleLogout = () => {
    try {
        localStorage.removeItem('vp_username');
        localStorage.removeItem('vp_signature');
    } catch {}
    if (auth.value.token) {
        fetch(`${API_BASE}/api/logout`, {
            method: 'POST',
            headers: authHeader()
        }).catch(() => {});
    }
    window.electronAPI?.logout?.();
};

const openEditProfile = () => {
    editForm.value = {
        nickname: auth.value.nickname || auth.value.username || '',
        signature: auth.value.signature || '',
        gender: auth.value.gender || '',
        birthday: auth.value.birthday || '',
        country: auth.value.country || '',
        province: auth.value.province || '',
        region: auth.value.region || ''
    };
    isEditOpen.value = true;
};

const closeEditProfile = () => {
    isEditOpen.value = false;
};

const saveProfile = async () => {
    if (!auth.value.token) return;
    const payload = {
        nickname: editForm.value.nickname || '',
        signature: editForm.value.signature || '',
        gender: editForm.value.gender || '',
        birthday: editForm.value.birthday || '',
        country: editForm.value.country || '',
        province: editForm.value.province || '',
        region: editForm.value.region || ''
    };
    try {
        const res = await fetch(`${API_BASE}/api/profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeader()
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data?.success && data.user) {
            auth.value = {
                ...auth.value,
                ...data.user
            };
            try {
                localStorage.setItem('vp_username', auth.value.username || '');
                localStorage.setItem('vp_nickname', auth.value.nickname || '');
                localStorage.setItem('vp_signature', auth.value.signature || '');
            } catch {}
            isEditOpen.value = false;
        }
    } catch {}
};

const showProfile = () => {
    if (profileHideTimer) {
        clearTimeout(profileHideTimer);
        profileHideTimer = null;
    }
    isProfileVisible.value = true;
};

const hideProfile = () => {
    if (profileHideTimer) {
        clearTimeout(profileHideTimer);
        profileHideTimer = null;
    }
    isProfileVisible.value = false;
};

const scheduleHideProfile = () => {
    if (profileHideTimer) {
        clearTimeout(profileHideTimer);
    }
    profileHideTimer = setTimeout(() => {
        isProfileVisible.value = false;
        profileHideTimer = null;
    }, 120);
};

const displayName = computed(() => {
    return auth.value.nickname || auth.value.username || `用户${auth.value.uid || ''}`;
});

const initials = computed(() => {
    const name = auth.value.username || 'ME';
    return name.slice(0, 2).toUpperCase();
});

const signature = computed(() => {
    return auth.value.signature || '这个人很神秘，暂未填写签名';
});

const nicknameCount = computed(() => editForm.value.nickname.length);
const signatureCount = computed(() => editForm.value.signature.length);

const filteredFriends = computed(() => {
    const query = searchText.value.trim().toLowerCase();
    if (!query) return friends.value;
    return friends.value.filter(
        (item) =>
            item.username?.toLowerCase().includes(query) ||
            String(item.uid).includes(query)
    );
});

const canSend = computed(() => {
    return (
        !!auth.value.token &&
        !!activeFriend.value?.uid &&
        draft.value.trim().length > 0
    );
});

const activeFriendOnline = computed(() => {
    if (!activeFriend.value) return false;
    return activeFriend.value.online === true;
});

const formatTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

const renderMessage = (msg) => {
    if (msg.type === 'text') {
        return msg.data?.content || '';
    }
    if (msg.type === 'image') return '[图片消息]';
    if (msg.type === 'video') return '[视频消息]';
    if (msg.type === 'voice') return '[语音消息]';
    if (msg.type === 'gif') return '[GIF 表情]';
    return '[未知消息]';
};

const authHeader = () => {
    if (!auth.value.token) return {};
    return { Authorization: `Bearer ${auth.value.token}` };
};

const playNotifySound = () => {
    try {
        const audio = new Audio(NOTIFY_SOUND_URL);
        audio.play().catch(() => {});
    } catch {}
};

const loadProfile = async ({ silent } = {}) => {
    if (!auth.value.token) return;
    try {
        const res = await fetch(`${API_BASE}/api/profile`, {
            headers: authHeader()
        });
        const data = await res.json();
        if (res.ok && data?.success && data.user) {
            const next = {
                uid: data.user.uid || auth.value.uid,
                username: data.user.username || auth.value.username,
                nickname: data.user.nickname || auth.value.nickname,
                signature: data.user.signature || auth.value.signature,
                gender: data.user.gender || auth.value.gender,
                birthday: data.user.birthday || auth.value.birthday,
                country: data.user.country || auth.value.country,
                province: data.user.province || auth.value.province,
                region: data.user.region || auth.value.region
            };
            const changed = Object.keys(next).some(
                (key) => next[key] !== auth.value[key]
            );
            if (changed) {
                auth.value = {
                    ...auth.value,
                    ...next
                };
                try {
                    localStorage.setItem('vp_username', auth.value.username || '');
                    localStorage.setItem('vp_nickname', auth.value.nickname || '');
                    localStorage.setItem('vp_signature', auth.value.signature || '');
                } catch {}
            }
        }
    } catch (error) {
        if (!silent) {
            console.warn('Profile refresh failed', error);
        }
    }
};
const loadAuth = async () => {
    const info = await window.electronAPI?.getAuthToken?.();
    if (info?.token) {
        auth.value = {
            token: info.token,
            uid: info.uid,
            username: info.username || '',
            nickname: info.nickname || '',
            signature: info.signature || '',
            gender: info.gender || '',
            birthday: info.birthday || '',
            country: info.country || '',
            province: info.province || '',
            region: info.region || ''
        };
    } else {
        const fallback = localStorage.getItem('vp_username');
        const fallbackNickname = localStorage.getItem('vp_nickname');
        const fallbackSignature = localStorage.getItem('vp_signature');
        auth.value = {
            token: '',
            uid: null,
            username: fallback || '',
            nickname: fallbackNickname || '',
            signature: fallbackSignature || '',
            gender: '',
            birthday: '',
            country: '',
            province: '',
            region: ''
        };
    }
};

const buildFriendSignature = (items) => {
    return items
        .map((item) => `${item.uid}-${item.username}-${item.online ? 1 : 0}`)
        .join('|');
};

const buildMessageSignature = (items) => {
    if (!items.length) return '';
    const last = items[items.length - 1];
    return `${items.length}-${last.id}-${last.createdAt}`;
};

const loadFriends = async ({ silent } = {}) => {
    if (!auth.value.token) return;
    try {
        const res = await fetch(`${API_BASE}/api/friends/list`, {
            headers: {
                ...authHeader()
            }
        });
        const data = await res.json();
        if (res.ok && data?.success) {
            const next = data.friends || [];
            const signature = buildFriendSignature(next);
            if (signature !== lastFriendSignature.value) {
                friends.value = next;
                lastFriendSignature.value = signature;
            }
            if (activeFriend.value) {
                const refreshed = next.find((item) => item.uid === activeFriend.value.uid);
                if (refreshed && refreshed !== activeFriend.value) {
                    activeFriend.value = refreshed;
                }
            } else if (friends.value.length) {
                selectFriend(friends.value[0]);
            }
        }
    } catch (err) {
        if (!silent) {
            statusText.value = '好友加载失败';
        }
    }
};

const loadMessages = async (targetUid, { silent } = {}) => {
    if (!auth.value.token || !targetUid) return;
    if (!silent) {
        loading.value = true;
    }
    try {
        const url = `${API_BASE}/api/chat/get?targetType=private&targetUid=${targetUid}`;
        const res = await fetch(url, { headers: authHeader() });
        const data = await res.json();
        if (res.ok && data?.success) {
            const next = data.data || [];
            const signature = buildMessageSignature(next);
            if (signature !== lastMessageSignature.value) {
                const shouldStick = isAtBottom();
                const incoming = next.filter(
                    (msg) => msg.senderUid !== auth.value.uid
                );
                if (incoming.length) {
                    const latestIncoming = incoming[incoming.length - 1];
                    const latestId = latestIncoming.id || latestIncoming.createdAt || '';
                    if (latestId && latestId !== lastNotifiedMessageId.value) {
                        playNotifySound();
                        lastNotifiedMessageId.value = latestId;
                    }
                }
                messages.value = next;
                lastMessageSignature.value = signature;
                if (shouldStick) {
                    await nextTick();
                    scrollToBottom();
                }
            }
        } else {
            if (!silent) {
                messages.value = [];
                lastMessageSignature.value = '';
            }
        }
    } catch (err) {
        if (!silent) {
            messages.value = [];
            lastMessageSignature.value = '';
        }
    } finally {
        if (!silent) {
            loading.value = false;
        }
    }
};

const selectFriend = (friend) => {
    activeFriend.value = friend;
    loadMessages(friend.uid);
};

const sendMessage = async () => {
    if (!canSend.value) return;
    const content = draft.value.trim();
    if (!content) return;
    try {
        const res = await fetch(`${API_BASE}/api/chat/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeader()
            },
            body: JSON.stringify({
                senderUid: auth.value.uid,
                targetUid: activeFriend.value.uid,
                targetType: 'private',
                type: 'text',
                content
            })
        });
        const data = await res.json();
        if (res.ok && data?.success) {
            messages.value = [...messages.value, data.data];
            draft.value = '';
            await nextTick();
            scrollToBottom();
        }
    } catch (err) {
        statusText.value = '发送失败';
    }
};

const isAtBottom = () => {
    const el = chatBodyRef.value;
    if (!el) return true;
    return el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
};

const scrollToBottom = () => {
    const el = chatBodyRef.value;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
};

onMounted(async () => {
    requestAnimationFrame(() => {
        isReady.value = true;
    });
    await loadAuth();
    await loadProfile();
    await loadFriends();
    pollTimers.friends = setInterval(() => {
        loadFriends({ silent: true });
    }, 3000);
    pollTimers.messages = setInterval(() => {
        if (activeFriend.value?.uid) {
            loadMessages(activeFriend.value.uid, { silent: true });
        }
    }, 1000);
    pollTimers.profile = setInterval(() => {
        loadProfile({ silent: true });
    }, 5000);
});

onBeforeUnmount(() => {
    if (pollTimers.friends) clearInterval(pollTimers.friends);
    if (pollTimers.messages) clearInterval(pollTimers.messages);
    if (pollTimers.profile) clearInterval(pollTimers.profile);
    if (profileHideTimer) {
        clearTimeout(profileHideTimer);
        profileHideTimer = null;
    }
});
</script>

<style scoped>
.app-shell {
    height: 100vh;
    background: radial-gradient(circle at top left, #f5fbff, #eef5ff 45%, #e8f1ff);
    position: relative;
    overflow: hidden;
    opacity: 0;
    transform: translateY(10px) scale(0.985);
    transition: opacity 280ms ease, transform 320ms ease;
}

.app-shell.app-enter {
    opacity: 1;
    transform: translateY(0) scale(1);
}

.app-shell::before,
.app-shell::after {
    content: "";
    position: absolute;
    border-radius: 50%;
    filter: blur(0px);
    opacity: 0.7;
}

.app-shell::before {
    width: 380px;
    height: 380px;
    background: rgba(59, 213, 255, 0.18);
    top: -120px;
    right: -60px;
}

.app-shell::after {
    width: 520px;
    height: 520px;
    background: rgba(72, 147, 214, 0.16);
    bottom: -220px;
    left: -120px;
}

.topbar {
    height: var(--titlebar-h);
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    padding: 0 18px;
    position: relative;
    z-index: 2;
    -webkit-app-region: drag;
}

.brand {
    display: flex;
    align-items: center;
    gap: 12px;
}

.brand-mark {
    width: 30px;
    height: 30px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #fff;
    font-weight: 700;
    display: grid;
    place-items: center;
    box-shadow: var(--shadow);
    font-size: 16px;
}

.brand-title {
    font-weight: 700;
    font-size: 14px;
}

.brand-sub {
    font-size: 11px;
    color: var(--ink-soft);
}

.topbar-center {
    display: flex;
    justify-content: center;
}

.status-pill {
    padding: 4px 12px;
    border-radius: 999px;
    background: rgba(72, 147, 214, 0.14);
    color: #1d4ed8;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
}

.topbar-right {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 16px;
}

.user-card-wrap {
    position: relative;
    -webkit-app-region: no-drag;
}

.user-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 10px;
    border-radius: 12px;
    background: var(--panel-soft);
    border: 1px solid var(--line);
}

.user-avatar {
    width: 28px;
    height: 28px;
    border-radius: 10px;
    background: #1f4c7a;
    color: #fff;
    font-size: 12px;
    font-weight: 600;
    display: grid;
    place-items: center;
    -webkit-app-region: no-drag;
}

.user-meta {
    display: grid;
    gap: 2px;
}

.profile-popover {
    position: absolute;
    top: 44px;
    right: 0;
    width: 320px;
    height: 360px;
    background: linear-gradient(145deg, #ffffff, #f2f5fb);
    border-radius: 18px;
    padding: 20px;
    box-shadow: 0 18px 48px rgba(22, 32, 52, 0.16);
    border: 1px solid rgba(31, 65, 120, 0.12);
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 180ms ease, transform 220ms ease;
    pointer-events: none;
    z-index: 20;
    -webkit-app-region: no-drag;
}

.profile-popover.is-visible {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
}

.profile-head {
    display: flex;
    gap: 14px;
    align-items: center;
    margin-bottom: 18px;
}

.profile-avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: #1f4c7a;
    color: #fff;
    display: grid;
    place-items: center;
    font-weight: 700;
    font-size: 16px;
}

.profile-meta {
    display: grid;
    gap: 6px;
}

.profile-name {
    font-size: 18px;
    font-weight: 700;
    color: #1c2436;
}

.profile-uid {
    font-size: 12px;
    color: rgba(28, 36, 54, 0.6);
}

.profile-signature {
    font-size: 12px;
    color: rgba(28, 36, 54, 0.7);
    line-height: 1.4;
}

.profile-details {
    display: grid;
    gap: 4px;
    margin-top: 6px;
    font-size: 12px;
    color: rgba(28, 36, 54, 0.65);
}

.profile-detail {
    line-height: 1.4;
}

.profile-actions {
    margin-top: auto;
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    -webkit-app-region: no-drag;
}

.profile-btn {
    border: none;
    border-radius: 12px;
    padding: 10px 18px;
    background: #1d4ed8;
    color: #fff;
    font-weight: 600;
    cursor: pointer;
    -webkit-app-region: no-drag;
}

.profile-btn.ghost {
    background: rgba(29, 78, 216, 0.12);
    color: #1d4ed8;
}

.profile-btn.ghost:hover {
    background: rgba(220, 38, 38, 0.16);
    color: #dc2626;
}

.profile-modal {
    position: fixed;
    inset: 0;
    z-index: 2000;
    display: grid;
    place-items: center;
}

.profile-modal__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(15, 23, 42, 0.25);
    backdrop-filter: blur(4px);
}

.profile-modal__panel {
    position: relative;
    width: 520px;
    max-width: calc(100vw - 32px);
    background: #f7f9ff;
    border-radius: 18px;
    border: 1px solid rgba(31, 65, 120, 0.12);
    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.2);
    padding: 20px 22px 18px;
    z-index: 1;
    -webkit-app-region: no-drag;
}

.profile-modal__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
}

.profile-modal__title {
    font-size: 16px;
    font-weight: 700;
    color: #1c2436;
}

.profile-modal__close {
    border: none;
    background: transparent;
    font-size: 20px;
    cursor: pointer;
    color: #6b7280;
}

.profile-modal__body {
    display: grid;
    gap: 12px;
}

.profile-modal__avatar {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: #1f4c7a;
    color: #fff;
    display: grid;
    place-items: center;
    font-weight: 700;
    font-size: 20px;
    margin: 0 auto 6px;
}

.profile-field {
    display: grid;
    gap: 6px;
}

.profile-field__label {
    font-size: 12px;
    color: rgba(28, 36, 54, 0.65);
}

.profile-field__control {
    position: relative;
}

.profile-field__control input {
    width: 100%;
}

.profile-field__count {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 11px;
    color: rgba(28, 36, 54, 0.5);
}

.profile-field select,
.profile-field input[type="date"] {
    width: 100%;
}

.profile-field--split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

.profile-modal__footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 16px;
}

.user-name {
    font-size: 12px;
    font-weight: 600;
}

.user-id {
    font-size: 10px;
    color: var(--ink-soft);
}

.window-controls {
    display: flex;
    -webkit-app-region: no-drag;
}

.wc-btn {
    width: 40px;
    height: 28px;
    background: transparent;
    border: none;
    color: #6b7280;
    cursor: pointer;
    border-radius: 8px;
    transition: background 0.2s;
}

.wc-btn:hover {
    background: rgba(27, 28, 32, 0.08);
}

.wc-btn.close:hover {
    background: #d04732;
    color: #fff;
}

.wc-icon {
    font-family: "Segoe MDL2 Assets";
    font-size: 9px;
}

.layout {
    height: calc(100vh - var(--titlebar-h));
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 18px;
    padding: 16px 20px 20px;
    position: relative;
    z-index: 1;
}

.sidebar {
    background: var(--panel-soft);
    border-radius: var(--radius-lg);
    border: 1px solid var(--line);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    box-shadow: var(--shadow);
    opacity: 0;
    transform: translateY(6px);
    transition: opacity 260ms ease 60ms, transform 320ms ease 60ms;
}

.search {
    display: grid;
    gap: 8px;
}

.search-hint {
    font-size: 11px;
    color: var(--ink-soft);
    text-align: right;
}

.list {
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.section-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-soft);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    height: 4vh;
}

.list-item {
    display: grid;
    grid-template-columns: 42px 1fr;
    gap: 12px;
    align-items: center;
    text-align: left;
    border: 1px solid transparent;
    border-radius: 14px;
    padding: 10px;
    background: #fff;
    transition: transform 0.2s var(--ease), border 0.2s;
    cursor: pointer;
    width: 100%;
    height: 70px;
}

.list-item:hover {
    transform: translateY(-2px);
    border-color: rgba(72, 147, 214, 0.5);
}

.list-item.active {
    border-color: rgba(72, 147, 214, 0.6);
    box-shadow: 0 12px 20px rgba(72, 147, 214, 0.18);
}

.avatar {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    background: #1f4c7a;
    color: #fff;
    font-weight: 600;
    display: grid;
    place-items: center;
    font-size: 13px;
}

.list-meta {
    display: grid;
    gap: 4px;
    min-width: 0;
}

.list-name {
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.list-sub {
    font-size: 12px;
    color: var(--ink-soft);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}


.empty-state {
    font-size: 12px;
    color: var(--ink-soft);
    text-align: center;
    padding: 20px 0;
}

.chat {
    background: var(--panel);
    border-radius: var(--radius-lg);
    border: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    min-height: 0;
    box-shadow: var(--shadow);
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 280ms ease 120ms, transform 360ms ease 120ms;
}

.chat-header {
    padding: 18px 22px;
    border-bottom: 1px solid var(--line);
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.app-shell.app-enter .sidebar,
.app-shell.app-enter .chat {
    opacity: 1;
    transform: translateY(0);
}

.chat-title {
    font-size: 18px;
    font-weight: 700;
}

.chat-sub {
    font-size: 12px;
    color: var(--ink-soft);
}

.chat-actions {
    display: flex;
    gap: 8px;
}

.chip {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 4px 10px;
    border-radius: 999px;
    background: rgba(72, 147, 214, 0.16);
    color: #1d4ed8;
}

.chip.offline {
    background: rgba(148, 163, 184, 0.2);
    color: #64748b;
}

.chat-body {
    padding: 20px 24px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
    flex: 1;
    min-height: 0;
    background: linear-gradient(180deg, rgba(243, 248, 255, 0.8), rgba(255, 255, 255, 0.95));
}

.bubble-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.bubble {
    max-width: 50%;
    width: fit-content;
    padding: 12px 14px;
    border-radius: 16px;
    background: #f3f7ff;
    box-shadow: 0 8px 18px rgba(27, 28, 32, 0.08);
    display: grid;
    gap: 6px;
}

.bubble.self {
    align-self: flex-end;
    background: #2b6cb0;
    color: #fff;
}

.bubble-name {
    font-size: 11px;
    font-weight: 600;
    opacity: 0.7;
}

.bubble-text {
    font-size: 14px;
    line-height: 1.5;
    font-family: "Microsoft YaHei", "Noto Sans SC", sans-serif;
    white-space: pre-wrap;
    word-break: break-word;
}

.serach_input_box{
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
}


.bubble-time {
    font-size: 10px;
    opacity: 0.6;
    text-align: right;
}

.composer {
    padding: 16px 22px 18px;
    border-top: 1px solid var(--line);
    display: grid;
    grid-template-columns: 1fr 120px;
    gap: 12px;
    flex: 0 0 auto;
}

.composer textarea {
    min-height: 70px;
    resize: none;
    font-family: "Microsoft YaHei", "Noto Sans SC", sans-serif;
}

.send-btn {
    border: none;
    border-radius: 14px;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #fff;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s var(--ease);
}

.send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
}

.send-btn:not(:disabled):hover {
    transform: translateY(-2px);
}

.loading,
.empty-chat {
    font-size: 13px;
    color: var(--ink-soft);
    text-align: center;
}

.serach_input{
    width: 80%;
     border-radius: 8px;
}


.add_friend_icon{
    width: 46px;
    height: 46px;
    border-radius: 8px;
    cursor: pointer;
    margin: 5px;
        margin-left: 10px;
    color: #1d4ed8;
    background-color: #eaf2ff;
    border: 1px solid rgba(72, 147, 214, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>
