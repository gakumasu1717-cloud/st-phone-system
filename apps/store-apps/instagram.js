/**
 * ST Phone System - Instagram App
 * AI 기반 프로액티브 포스팅, 댓글, 좋아요 시스템
 */

window.STPhone = window.STPhone || {};
window.STPhone.Apps = window.STPhone.Apps || {};

window.STPhone.Apps.Instagram = (function() {
    'use strict';

    const STORAGE_KEY = 'stphone_instagram_posts';
    let posts = [];
    let isGeneratingPost = false;
    let isProcessingComments = false;  // 댓글 처리 중 플래그 (포스팅과 분리)
    let lastPostTime = 0;  // 마지막 포스팅 시간 (중복 방지)
    const POST_COOLDOWN = 30000;  // 30초 절대러
    
    // 무한스크롤 설정
    const POSTS_PER_PAGE = 5;
    let currentPage = 1;
    let isLoadingMore = false;
    let currentView = 'feed'; // 'feed', 'create', 'profile'

    // ========== CSS 스타일 ==========
    const css = `
        <style>
            .st-insta-app {
                position: absolute; top: 0; left: 0;
                width: 100%; height: 100%; z-index: 999;
                display: flex; flex-direction: column;
                background: var(--pt-bg-color, #fafafa);
                color: var(--pt-text-color, #262626);
                font-family: var(--pt-font, -apple-system, sans-serif);
                overflow: hidden;
            }
            .st-insta-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                border-bottom: 1px solid var(--pt-border, #dbdbdb);
                background: var(--pt-card-bg, #fff);
                flex-shrink: 0;
            }
            .st-insta-logo {
                font-family: 'Segoe Script', 'Dancing Script', cursive, sans-serif;
                font-size: 26px;
                font-weight: 600;
                background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            .st-insta-header-icons {
                display: flex;
                gap: 18px;
                font-size: 22px;
            }
            .st-insta-header-icon {
                cursor: pointer;
                opacity: 0.8;
                transition: opacity 0.2s;
            }
            .st-insta-header-icon:hover { opacity: 1; }
            .st-insta-header-date {
                font-size: 12px;
                color: var(--pt-text-muted, #8e8e8e);
                margin-left: 12px;
            }
            .st-insta-header-left {
                display: flex;
                align-items: center;
            }
            
            .st-insta-feed {
                flex: 1;
                overflow-y: auto;
                overflow-x: hidden;
                padding-bottom: 60px;
                -webkit-overflow-scrolling: touch;
            }
            .st-insta-feed::-webkit-scrollbar {
                width: 4px;
            }
            .st-insta-feed::-webkit-scrollbar-thumb {
                background: rgba(0,0,0,0.2);
                border-radius: 2px;
            }
            
            /* FAB 버튼 */
            .st-insta-fab {
                position: absolute;
                bottom: 80px;
                right: 20px;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: linear-gradient(135deg, rgba(245,133,41,0.85), rgba(221,42,123,0.85), rgba(129,52,175,0.85));
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 22px;
                cursor: pointer;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                z-index: 1000;
                transition: transform 0.2s, box-shadow 0.2s;
            }
            .st-insta-fab:hover {
                transform: scale(1.05);
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            }
            .st-insta-fab:active {
                transform: scale(0.95);
            }
            
            /* 더보기 버튼 (무한스크롤) */
            .st-insta-load-more {
                padding: 20px;
                text-align: center;
                cursor: pointer;
            }
            .st-insta-load-more-text {
                display: inline-block;
                padding: 10px 24px;
                background: var(--pt-card-bg, #fff);
                border: 1px solid var(--pt-border, #dbdbdb);
                border-radius: 20px;
                font-size: 14px;
                color: var(--pt-accent, #0095f6);
                font-weight: 500;
                transition: background 0.2s;
            }
            .st-insta-load-more:hover .st-insta-load-more-text {
                background: var(--pt-bg-color, #fafafa);
            }
            .st-insta-load-more.loading .st-insta-load-more-text {
                color: var(--pt-sub-text, #8e8e8e);
            }
            
            /* 스토리 영역 */
            .st-insta-stories {
                display: flex;
                gap: 12px;
                padding: 12px 16px;
                overflow-x: auto;
                border-bottom: 1px solid var(--pt-border, #dbdbdb);
                background: var(--pt-card-bg, #fff);
            }
            .st-insta-stories::-webkit-scrollbar { display: none; }
            .st-insta-story {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                flex-shrink: 0;
            }
            .st-insta-story-avatar {
                width: 56px; height: 56px;
                border-radius: 50%;
                padding: 2px;
                background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
            }
            .st-insta-story-avatar img {
                width: 100%; height: 100%;
                border-radius: 50%;
                border: 2px solid var(--pt-card-bg, #fff);
                object-fit: cover;
            }
            .st-insta-story-name {
                font-size: 11px;
                color: var(--pt-sub-text, #8e8e8e);
                max-width: 60px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            /* 포스트 카드 */
            .st-insta-post {
                background: var(--pt-card-bg, #fff);
                border-bottom: 1px solid var(--pt-border, #efefef);
                margin-bottom: 8px;
            }
            .st-insta-post-header {
                display: flex;
                align-items: center;
                padding: 12px 14px;
                gap: 10px;
            }
            .st-insta-post-avatar {
                width: 32px; height: 32px;
                border-radius: 50%;
                object-fit: cover;
            }
            .st-insta-post-author {
                flex: 1;
                font-weight: 600;
                font-size: 14px;
            }
            .st-insta-post-more {
                font-size: 16px;
                cursor: pointer;
                padding: 5px;
            }
            .st-insta-post-image {
                width: 100%;
                aspect-ratio: 1;
                object-fit: cover;
                background: #f0f0f0;
            }
            .st-insta-post-actions {
                display: flex;
                align-items: center;
                padding: 10px 14px;
                gap: 16px;
                font-size: 22px;
            }
            .st-insta-post-action {
                cursor: pointer;
                transition: transform 0.1s;
            }
            .st-insta-post-action:active { transform: scale(0.9); }
            .st-insta-post-action.liked { color: #ed4956; }
            .st-insta-post-bookmark {
                margin-left: auto;
            }
            .st-insta-post-likes {
                padding: 0 14px;
                font-weight: 600;
                font-size: 14px;
            }
            .st-insta-post-caption {
                padding: 6px 14px 8px;
                font-size: 14px;
                line-height: 1.4;
            }
            .st-insta-post-caption strong {
                font-weight: 600;
                margin-right: 5px;
            }
            .st-insta-post-comments {
                padding: 4px 14px 8px;
                font-size: 13px;
                color: var(--pt-sub-text, #8e8e8e);
                cursor: pointer;
            }
            .st-insta-post-time {
                padding: 0 14px 12px;
                font-size: 10px;
                color: var(--pt-sub-text, #8e8e8e);
                text-transform: uppercase;
            }
            .st-insta-comment-input {
                display: flex;
                align-items: center;
                padding: 10px 14px;
                gap: 12px;
                border-top: 1px solid var(--pt-border, #efefef);
            }
            .st-insta-comment-input input {
                flex: 1;
                border: none;
                background: transparent;
                font-size: 14px;
                outline: none;
                color: var(--pt-text-color, #262626);
            }
            .st-insta-comment-input input::placeholder {
                color: var(--pt-sub-text, #8e8e8e);
            }
            .st-insta-comment-btn {
                color: #0095f6;
                font-weight: 600;
                font-size: 14px;
                cursor: pointer;
                opacity: 0.5;
                transition: opacity 0.2s;
            }
            .st-insta-comment-btn.active { opacity: 1; }
            
            /* 댓글 리스트 */
            .st-insta-comments-list {
                padding: 0 14px 10px;
            }
            .st-insta-comments-hidden {
                display: none !important;
            }
            .st-insta-comment-item {
                display: flex;
                gap: 10px;
                padding: 6px 0;
                font-size: 13px;
                line-height: 1.4;
            }
            .st-insta-comment-avatar {
                width: 28px; height: 28px;
                border-radius: 50%;
                object-fit: cover;
                flex-shrink: 0;
            }
            .st-insta-comment-content {
                flex: 1;
            }
            .st-insta-comment-author {
                font-weight: 600;
                margin-right: 5px;
            }
            
            /* 포스트 생성 화면 */
            .st-insta-create {
                position: absolute;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: var(--pt-bg-color, #fafafa);
                display: flex;
                flex-direction: column;
                z-index: 1001;
            }
            .st-insta-create-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 14px 16px;
                border-bottom: 1px solid var(--pt-border, #dbdbdb);
                background: var(--pt-card-bg, #fff);
            }
            .st-insta-create-cancel {
                font-size: 16px;
                cursor: pointer;
            }
            .st-insta-create-title {
                font-weight: 600;
                font-size: 16px;
            }
            .st-insta-create-next {
                color: #0095f6;
                font-weight: 600;
                font-size: 16px;
                cursor: pointer;
            }
            .st-insta-create-next.disabled {
                opacity: 0.4;
                pointer-events: none;
            }
            .st-insta-create-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                padding: 16px;
                gap: 16px;
            }
            .st-insta-create-preview {
                width: 100%;
                aspect-ratio: 1;
                background: #f0f0f0;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: var(--pt-sub-text, #8e8e8e);
                font-size: 48px;
                overflow: hidden;
            }
            .st-insta-create-preview img {
                width: 100%; height: 100%;
                object-fit: cover;
            }
            .st-insta-create-prompt {
                width: 100%;
                padding: 14px;
                border: 1px solid var(--pt-border, #dbdbdb);
                border-radius: 8px;
                font-size: 14px;
                resize: none;
                min-height: 80px;
                outline: none;
                background: var(--pt-card-bg, #fff);
                color: var(--pt-text-color, #262626);
            }
            .st-insta-create-prompt::placeholder {
                color: var(--pt-sub-text, #8e8e8e);
            }
            .st-insta-create-caption {
                width: 100%;
                padding: 14px;
                border: 1px solid var(--pt-border, #dbdbdb);
                border-radius: 8px;
                font-size: 14px;
                resize: none;
                min-height: 60px;
                outline: none;
                background: var(--pt-card-bg, #fff);
                color: var(--pt-text-color, #262626);
            }
            .st-insta-create-caption::placeholder {
                color: var(--pt-sub-text, #8e8e8e);
            }
            .st-insta-create-btn {
                padding: 14px;
                background: #0095f6;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: opacity 0.2s;
            }
            .st-insta-create-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            .st-insta-create-btn:hover:not(:disabled) {
                opacity: 0.9;
            }
            
            /* 로딩 */
            .st-insta-loading {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 12px;
                padding: 40px;
            }
            .st-insta-spinner {
                width: 36px; height: 36px;
                border: 3px solid var(--pt-border, #dbdbdb);
                border-top-color: #0095f6;
                border-radius: 50%;
                animation: insta-spin 0.8s linear infinite;
            }
            @keyframes insta-spin {
                to { transform: rotate(360deg); }
            }
            
            /* 빈 피드 */
            .st-insta-empty {
                text-align: center;
                padding: 60px 40px;
                color: var(--pt-sub-text, #8e8e8e);
            }
            .st-insta-empty-icon {
                font-size: 64px;
                margin-bottom: 16px;
                opacity: 0.5;
            }
            .st-insta-empty-title {
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 8px;
                color: var(--pt-text-color, #262626);
            }
            
            /* 프로필 화면 */
            .st-insta-profile {
                position: absolute;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: var(--pt-bg-color, #fafafa);
                display: flex;
                flex-direction: column;
                z-index: 1001;
            }
            .st-insta-profile-header {
                display: flex;
                align-items: center;
                padding: 12px 16px;
                gap: 12px;
                border-bottom: 1px solid var(--pt-border, #dbdbdb);
                background: var(--pt-card-bg, #fff);
            }
            .st-insta-profile-back {
                font-size: 22px;
                cursor: pointer;
            }
            .st-insta-profile-name {
                flex: 1;
                font-weight: 600;
                font-size: 18px;
            }
            .st-insta-profile-content {
                flex: 1;
                overflow-y: auto;
            }
            .st-insta-profile-info {
                display: flex;
                align-items: center;
                padding: 20px;
                gap: 24px;
            }
            .st-insta-profile-avatar {
                width: 86px; height: 86px;
                border-radius: 50%;
                object-fit: cover;
                border: 2px solid var(--pt-border, #dbdbdb);
            }
            .st-insta-profile-stats {
                display: flex;
                gap: 24px;
            }
            .st-insta-profile-stat {
                text-align: center;
            }
            .st-insta-profile-stat-num {
                font-weight: 700;
                font-size: 18px;
            }
            .st-insta-profile-stat-label {
                font-size: 13px;
                color: var(--pt-sub-text, #8e8e8e);
            }
            .st-insta-profile-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 2px;
                padding: 2px;
            }
            .st-insta-profile-grid-item {
                aspect-ratio: 1;
                cursor: pointer;
            }
            .st-insta-profile-grid-item img {
                width: 100%; height: 100%;
                object-fit: cover;
            }
        </style>
    `;

    // ========== 기본 프롬프트 ==========
    const DEFAULT_PROMPTS = {
        // 댓글 관련 프롬프트만 유지 (통합 프롬프트는 generatePostAllInOne에서 직접 처리)
        commentContextCheck: `Would {{char}} comment on this post by {{postAuthor}}?
Caption: "{{postCaption}}"
Relationship: {{relationship}}
Answer YES or NO.`,

        characterComment: `You are {{char}} commenting on {{postAuthor}}'s post.
Caption: "{{postCaption}}"
Relationship: {{relationship}}
Write a short comment (1-2 sentences, in Korean).
Output ONLY the comment text, no quotes.`
    };

    // ========== 정규식 패턴 상수 ==========
    // 새 고정 형식: [IG_POST]캡션내용[/IG_POST]
    const INSTAGRAM_PATTERNS = {
        // 새 고정 형식 (권장)
        fixedPost: /\[IG_POST\]([\s\S]*?)\[\/IG_POST\]/i,
        fixedPostGlobal: /\[IG_POST\][\s\S]*?\[\/IG_POST\]/gi,
        fixedReply: /\[IG_REPLY\]([\s\S]*?)\[\/IG_REPLY\]/i,
        fixedReplyGlobal: /\[IG_REPLY\][\s\S]*?\[\/IG_REPLY\]/gi,
        fixedComment: /\[IG_COMMENT\]([\s\S]*?)\[\/IG_COMMENT\]/i, // 댓글 태그 추가
        fixedCommentGlobal: /\[IG_COMMENT\][\s\S]*?\[\/IG_COMMENT\]/gi,
        // 기존 패턴 (하위 호환)
        legacyPost: /\[Instagram 포스팅\][^"]*"([^"]+)"/i,
        legacyPostGlobal: /\[Instagram 포스팅\][^\n]*/gi,
        legacyReply: /\[Instagram 답글\][^"]*"([^"]+)"/i,
        legacyReplyGlobal: /\[Instagram 답글\][^\n]*/gi,
        legacyComment: /\[Instagram 댓글\][^"]*"([^"]+)"/i, // 파싱용 정규식 수정
        legacyCommentGlobal: /\[Instagram 댓글\][^\n]*/gi,
        // 괄호 형식 (하위 호환)
        parenPost: /\(Instagram:\s*"([^"]+)"\)/i,
        parenPostGlobal: /\(Instagram:\s*"[^"]+"\)/gi
    };
    
    // HTML 엔티티 디코딩 함수
    function decodeHtmlEntities(text) {
        if (!text) return '';
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        let decoded = textarea.value;
        // 추가 HTML 엔티티 처리
        decoded = decoded
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#91;/g, '[')
            .replace(/&#93;/g, ']')
            .replace(/&lbrack;/g, '[')
            .replace(/&rbrack;/g, ']');
        return decoded;
    }

    // ========== 유틸리티 함수 ==========
    
    // 사진 타입 감지 (프롬프트와 캡션에서 추론)
    function detectPhotoType(imagePrompt, caption) {
        const combined = `${imagePrompt || ''} ${caption || ''}`.toLowerCase();
        
        // 풍경/장소 관련 키워드
        const sceneryKeywords = ['landscape', 'scenery', 'view', 'sunset', 'sunrise', 'sky', 'beach', 'mountain', 'city', 'building', 'food', '음식', '풍경', '하늘', '노을', '바다', '산', '카페', '음료'];
        // 그룹 관련 키워드
        const groupKeywords = ['group', 'together', 'with', '같이', '함께', '우리', 'friends', 'family', 'couple', '커플'];
        // 셀피 관련 키워드
        const selfieKeywords = ['selfie', 'self', 'mirror', 'selca', '셀카', '셀피', '거울'];
        
        // 풍경 우선 체크 (사람 없는 사진)
        if (sceneryKeywords.some(kw => combined.includes(kw)) && !combined.includes('person') && !combined.includes('girl') && !combined.includes('boy')) {
            return 'scenery';
        }
        
        // 그룹 체크
        if (groupKeywords.some(kw => combined.includes(kw))) {
            return 'group';
        }
        
        // 셀피 체크 (기본값)
        if (selfieKeywords.some(kw => combined.includes(kw))) {
            return 'selfie';
        }
        
        // 기본값은 셀피
        return 'selfie';
    }
    
    // 앱 설치 여부 확인 헬퍼
    function isInstagramInstalled() {
        const Store = window.STPhone?.Apps?.Store;
        // Store가 없거나 isInstalled 함수가 없으면 설치 안 된 것으로 간주 (안전 처리)
        if (!Store || typeof Store.isInstalled !== 'function') {
            console.log('[Instagram] Store 또는 isInstalled 함수 없음 - 설치 안 된 것으로 간주');
            return false;
        }
        return Store.isInstalled('instagram');
    }

    // URL 유효성 검사 (XSS 방어) - sanitizeImageUrl에서 사용 안 하고 있으므로 간소화
    function isValidImageUrl(url) {
        if (!url || typeof url !== 'string') return false;
        if (url.startsWith('data:image/')) return true;
        if (url.startsWith('/') || url.startsWith('./')) return true;
        try {
            const parsed = new URL(url);
            return ['http:', 'https:'].includes(parsed.protocol);
        } catch (e) {
            return false;
        }
    }

    // 안전한 이미지 URL 반환 (현재 미사용 - 직접 imageUrl 사용)
    function sanitizeImageUrl(url) {
        return isValidImageUrl(url) ? url : '';
    }

    function stripDateTag(text) {
        if (!text) return '';
        // AI 응답에서 날짜 태그 제거: [2024년 5월 22일 수요일]
        return text.replace(/^\[\d{4}년\s*\d{1,2}월\s*\d{1,2}일\s*[^다-힐]+요일\]\s*/i, '').trim();
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function getStorageKey() {
        const context = window.SillyTavern?.getContext?.();
        if (!context?.chatId) return null;

        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        if (settings.recordMode === 'accumulate' && context.characterId !== undefined) {
            return STORAGE_KEY + '_char_' + context.characterId;
        }
        return STORAGE_KEY + '_' + context.chatId;
    }

    function loadPosts() {
        const key = getStorageKey();
        if (!key) {
            posts = [];
            return;
        }
        try {
            const saved = localStorage.getItem(key);
            posts = saved ? JSON.parse(saved) : [];
        } catch (e) {
            posts = [];
        }
    }

    function savePosts() {
        const key = getStorageKey();
        if (!key) return;
        try {
            // localStorage 용량 관리: 최신 100개만 유지
            const MAX_POSTS = 100;
            if (posts.length > MAX_POSTS) {
                console.log(`[Instagram] 게시물 수 초과 (${posts.length}), 최신 ${MAX_POSTS}개만 유지`);
                posts = posts.slice(0, MAX_POSTS);
            }
            localStorage.setItem(key, JSON.stringify(posts));
        } catch (e) {
            console.error('[Instagram] 저장 실패:', e);
            // QuotaExceededError 시 오래된 게시물 정리 시도
            if (e.name === 'QuotaExceededError') {
                console.warn('[Instagram] localStorage 용량 초과, 오래된 게시물 정리 중...');
                posts = posts.slice(0, 50); // 절반으로 줄임
                try {
                    localStorage.setItem(key, JSON.stringify(posts));
                    console.log('[Instagram] 정리 후 저장 성공');
                } catch (e2) {
                    console.error('[Instagram] 정리 후에도 저장 실패:', e2);
                }
            }
        }
    }

    function getPrompt(key) {
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        
        // 댓글 생성 프롬프트 - settings에서 가져오거나 기본값 사용
        if (key === 'characterComment') {
            return settings.instaCommentPrompt || DEFAULT_PROMPTS.characterComment;
        }
        
        // 나머지는 기본값 사용
        return DEFAULT_PROMPTS[key] || '';
    }

    function fillPrompt(template, vars) {
        let result = template;
        for (const [k, v] of Object.entries(vars)) {
            result = result.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'gi'), v || '');
        }
        return result;
    }

    // ========== 캘린더 연동 ==========
    function getCalendarInfo() {
        try {
            const Calendar = window.STPhone.Apps?.Calendar;
            
            // 캘린더 앱 자체가 없으면 null
            if (!Calendar) return null;
            
            // 캘린더 비활성화면 null
            if (typeof Calendar.isCalendarEnabled === 'function' && !Calendar.isCalendarEnabled()) {
                return null;
            }
            
            const rpDate = Calendar.getRpDate?.();
            
            // rpDate 유효성 검사 강화
            if (!rpDate || 
                typeof rpDate.year !== 'number' || 
                typeof rpDate.month !== 'number' || 
                typeof rpDate.day !== 'number') {
                return null;
            }
            
            const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
            const dateObj = new Date(rpDate.year, rpDate.month - 1, rpDate.day);
            
            // 유효한 날짜인지 확인
            if (isNaN(dateObj.getTime())) {
                console.warn('[Instagram] 유효하지 않은 RP 날짜:', rpDate);
                return null;
            }
            
            const dayOfWeek = dayNames[dateObj.getDay()];
            
            return {
                year: rpDate.year,
                month: rpDate.month,
                day: rpDate.day,
                dayOfWeek,
                formatted: `${rpDate.year}년 ${rpDate.month}월 ${rpDate.day}일 ${dayOfWeek}`,
                timestamp: dateObj.getTime()
            };
        } catch (e) {
            console.warn('[Instagram] 캘린더 정보 조회 실패:', e);
            return null;
        }
    }

    function getRpTimestamp() {
        const calInfo = getCalendarInfo();
        if (calInfo) {
            // RP 날짜 기준 현재 시간으로 타임스탬프 생성
            const now = new Date();
            const rpDate = new Date(calInfo.year, calInfo.month - 1, calInfo.day, 
                now.getHours(), now.getMinutes(), now.getSeconds());
            return rpDate.getTime();
        }
        return Date.now();
    }

    function getRecentChatContext(maxMessages = 15) {
        const ctx = window.SillyTavern?.getContext?.();
        if (!ctx?.chat) return '';
        
        const recent = ctx.chat.slice(-maxMessages);
        return recent.map(m => {
            const sender = m.is_user ? 'User' : m.name;
            return `${sender}: ${m.mes}`;
        }).join('\n');
    }

    // 연락처에서 캐릭터 성격 정보 가져오기 (Contacts 앱에 저장된 정보 사용)
    function getCharacterPersonality(charName) {
        const contact = getContactByName(charName);
        if (contact?.persona) {
            return contact.persona;
        }
        // 연락처에 없으면 빈 문자열
        return '';
    }

    // persona(description)에서 외모 관련 힌트 추출
    function extractVisualHints(persona) {
        if (!persona || typeof persona !== 'string') return 'average appearance';
        
        // 외모 관련 키워드 패턴
        const visualPatterns = [
            // 머리카락
            /(?:black|brown|blonde|red|white|silver|blue|pink|purple|green|yellow|orange|gray|grey)\s*hair/gi,
            /(?:long|short|medium|curly|straight|wavy)\s*hair/gi,
            // 눈
            /(?:blue|green|brown|black|red|purple|golden|amber|heterochromia)\s*eyes?/gi,
            // 체형
            /(?:tall|short|slim|muscular|athletic|petite|average)\s*(?:build|body|height)?/gi,
            // 성별/나이
            /(?:male|female|boy|girl|man|woman|young|old|teenage|adult)/gi,
            // 특징
            /(?:glasses|freckles|scar|tattoo|piercing|beard|mustache)/gi
        ];
        
        const found = [];
        for (const pattern of visualPatterns) {
            const matches = persona.match(pattern);
            if (matches) {
                found.push(...matches.map(m => m.toLowerCase().trim()));
            }
        }
        
        // 중복 제거하고 반환
        const unique = [...new Set(found)];
        return unique.length > 0 ? unique.join(', ') : 'average appearance';
    }

    function getContactByName(name) {
        const contacts = window.STPhone.Apps?.Contacts?.getAllContacts?.() || [];
        return contacts.find(c => c?.name?.toLowerCase() === name?.toLowerCase());
    }

    function getUserInfo() {
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        return {
            name: settings.userName || 'User',
            avatar: settings.userAvatar || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'
        };
    }

    // 현재 캐릭터 정보 가져오기 (연락처에서)
    function getCharacterInfo() {
        const contacts = window.STPhone.Apps?.Contacts?.getAllContacts?.() || [];
        // 첫 번째 연락처를 캐릭터로 간주 (보통 메인 캐릭터)
        if (contacts.length > 0) {
            const contact = contacts[0];
            return {
                name: contact.name || 'Character',
                avatar: contact.avatar || getContactAvatar(contact.name),
                personality: contact.persona || ''
            };
        }
        // 연락처 없으면 SillyTavern 컨텍스트에서
        const ctx = window.SillyTavern?.getContext?.();
        const charName = ctx?.name2 || 'Character';
        return {
            name: charName,
            avatar: getContactAvatar(charName),
            personality: ''
        };
    }

    function getContactAvatar(name) {
        const contact = getContactByName(name);
        if (contact?.avatar) return contact.avatar;
        
        // 캐릭터 아바타
        const ctx = window.SillyTavern?.getContext?.();
        if (ctx?.characters) {
            for (const char of ctx.characters) {
                if (char?.name?.toLowerCase() === name?.toLowerCase() && char?.avatar) {
                    return `/characters/${encodeURIComponent(char.avatar)}`;
                }
            }
        }
        
        return 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png';
    }

    function formatTimeAgo(timestamp) {
        // 캘린더가 활성화되어 있으면 RP 날짜 기준으로 계산
        const calInfo = getCalendarInfo();
        let now;
        
        if (calInfo) {
            // RP 날짜 + 현재 시간으로 "지금" 시점 계산
            const realNow = new Date();
            now = new Date(calInfo.year, calInfo.month - 1, calInfo.day, 
                realNow.getHours(), realNow.getMinutes(), realNow.getSeconds()).getTime();
        } else {
            now = Date.now();
        }
        
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        // 음수면 (미래 날짜면) 날짜 형식으로 표시
        if (diff < 0) {
            return formatPostDate(timestamp);
        }
        
        if (minutes < 1) return '방금 전';
        if (minutes < 60) return `${minutes}분 전`;
        if (hours < 24) return `${hours}시간 전`;
        if (days < 7) return `${days}일 전`;
        return formatPostDate(timestamp);
    }

    // 포스트 날짜 포맷 (캘린더 스타일)
    function formatPostDate(timestamp) {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        const dayOfWeek = dayNames[date.getDay()];
        return `${year}.${month}.${day} ${dayOfWeek}요일`;
    }

    // 최근 채팅 히스토리 가져오기
    function getChatHistory(maxTokens = 500) {
        const ctx = window.SillyTavern?.getContext?.();
        if (!ctx?.chat || ctx.chat.length === 0) return '(대화 없음)';

        const reverseChat = ctx.chat.slice().reverse();
        const collected = [];
        let currentTokens = 0;

        for (const m of reverseChat) {
            const msgContent = m.mes || '';
            if (!msgContent.trim()) continue;
            
            const estimatedTokens = Math.ceil(msgContent.length / 2.5);
            if (currentTokens + estimatedTokens > maxTokens) break;

            const role = m.is_user ? 'User' : m.name || 'Character';
            collected.unshift(`${role}: ${msgContent.substring(0, 200)}`);
            currentTokens += estimatedTokens;
        }

        return collected.length > 0 ? collected.join('\n') : '(대화 없음)';
    }

    // ========== AI 생성 함수 ==========
    function normalizeModelOutput(raw) {
        if (raw == null) return '';
        if (typeof raw === 'string') return raw;
        if (typeof raw?.content === 'string') return raw.content;
        if (typeof raw?.text === 'string') return raw.text;
        const choiceContent = raw?.choices?.[0]?.message?.content;
        if (typeof choiceContent === 'string') return choiceContent;
        try { return JSON.stringify(raw); } catch { return String(raw); }
    }

    // AI 응답에서 캘린더 날짜 패턴 제거
    function stripCalendarDate(text) {
        if (!text) return '';
        return text.replace(/\[\d{4}년\s*\d{1,2}월\s*\d{1,2}일\s*(?:월|화|수|목|금|토|일)요일\]\s*/g, '').trim();
    }

    async function generateWithAI(prompt, maxTokens = 150) {
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        const profileId = settings.connectionProfileId;

        window.STPhone.isPhoneGenerating = true;
        console.log('[Instagram] generateWithAI 시작, profileId:', profileId);

        try {
            const context = window.SillyTavern?.getContext?.();
            if (!context) throw new Error('SillyTavern context not available');

            // Connection Profile 사용 (우선)
            if (profileId) {
                console.log('[Instagram] Connection Profile 사용 시도...');
                const connectionManager = context.ConnectionManagerRequestService;
                if (connectionManager && typeof connectionManager.sendRequest === 'function') {
                    console.log('[Instagram] sendRequest 호출 중...');
                    const result = await connectionManager.sendRequest(
                        profileId,
                        [{ role: 'user', content: prompt }],
                        maxTokens,
                        {},
                        { max_tokens: maxTokens }
                    );
                    console.log('[Instagram] sendRequest 결과:', result);
                    return stripCalendarDate(normalizeModelOutput(result).trim());
                } else {
                    console.log('[Instagram] connectionManager 없음 또는 sendRequest 없음');
                }
            }

            // Fallback: genraw
            console.log('[Instagram] genraw fallback 사용...');
            const parser = context.SlashCommandParser || window.SlashCommandParser;
            const genCmd = parser?.commands?.['genraw'];
            if (genCmd?.callback) {
                console.log('[Instagram] genraw 호출 중...');
                const result = await genCmd.callback({ quiet: true, hidden: true }, prompt);
                console.log('[Instagram] genraw 결과:', result);
                return stripCalendarDate(String(result || '').trim());
            }

            console.log('[Instagram] 사용 가능한 AI 메서드 없음');
            return null;
        } catch (e) {
            console.error('[Instagram] AI 생성 실패:', e);
            return null;
        } finally {
            window.STPhone.isPhoneGenerating = false;
        }
    }

    async function generateDetailedPrompt(userInput, characterName, photoType = 'selfie', isCharacterPost = false) {
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};

        // 1. 사용자(User)와 상대방(Character) 정보 명확히 분리
        const user = getUserInfo();
        const userName = user.name || 'User';
        // User 태그가 없으면 기본값 설정 (오류 방지)
        const userTags = settings.userTags || 'average appearance, casual clothes';

        // characterName이 유저 이름과 같으면 유저 자신의 사진
        const isUserSelfie = (characterName?.toLowerCase() === userName?.toLowerCase());
        
        const contact = getContactByName(characterName);
        // Character 태그가 없으면 persona(description)에서 추출 시도, 그것도 없으면 이름으로 대체
        let charTags = contact?.tags;
        if (!charTags || charTags.trim() === '') {
            // 유저 자신의 사진이면 userTags 사용
            if (isUserSelfie) {
                charTags = userTags;
            } else if (contact?.persona) {
                // persona에서 외모 관련 정보 추출 시도
                // persona가 있으면 그것을 기반으로 간단한 태그 생성
                charTags = `${characterName}, ${extractVisualHints(contact.persona)}`;
            } else {
                charTags = `${characterName}, average appearance`;
            }
        }
        
        // 포스터/파트너 결정
        const posterName = isCharacterPost ? characterName : userName;
        const posterTags = isCharacterPost ? charTags : userTags;
        const partnerName = isCharacterPost ? userName : characterName;
        const partnerTags = isCharacterPost ? userTags : charTags;
        
        console.log('[Instagram] generateDetailedPrompt 호출:', {
            posterName, posterTags: posterTags?.substring(0, 50),
            partnerName, partnerTags: partnerTags?.substring(0, 50),
            photoType, userInput: userInput?.substring(0, 50),
            isCharacterPost
        });

        // 2. 사진 모드 힌트
        let photoTypeHint = '';
        if (photoType === 'selfie') {
            photoTypeHint = `Selfie (upper body, medium shot)`;
        } else if (photoType === 'group') {
            photoTypeHint = `Two-shot/Group (both people visible)`;
        } else if (photoType === 'scenery') {
            photoTypeHint = `Scenery/Object (environment focus)`;
        } else {
            photoTypeHint = `General (medium shot)`;
        }

        // 3. AI 판단 중심 프롬프트 - 단어 매핑 없이 의미 분석
        const aiInstruction = `[System] Generate a Stable Diffusion prompt for a photo.

### PEOPLE INFO
- POSTER (who is posting): ${posterName}
  Visual Tags: ${posterTags}
- PARTNER (the other person): ${partnerName}
  Visual Tags: ${partnerTags}

### PHOTO CONTEXT
- This post is written by: ${posterName}
- Camera Mode: ${photoTypeHint}
- Caption/Request: "${userInput}"

### YOUR TASK
Analyze the caption semantically to determine WHO should appear in the photo:
- If the poster is taking a photo of THEMSELVES → use POSTER's visual tags
- If the poster is taking a photo of their PARTNER → use PARTNER's visual tags  
- If it's a TWO-SHOT (both people together) → combine BOTH visual tags
- If it's scenery/food/object → describe that instead

IMPORTANT:
- Avoid extreme close-ups. Use medium shot, upper body, or cowboy shot.
- Output ONLY the XML tag, nothing else.

### OUTPUT FORMAT
<pic prompt="(character visual tags), (pose/action), (scene), (lighting), (shot type)">`;

        try {
            // AI에게 판단 요청
            const result = await generateWithAI(aiInstruction, 250);
            const resultStr = String(result || '').trim();

            // 1. XML 태그 형식이 있는지 먼저 확인 (줄바꿈, 공백, 따옴표 유연성 개선)
            const regex = /<pic[^>]*prompt=["']([^"']*)["'][^>]*>/i;
            const match = resultStr.match(regex);

            if (match && match[1]?.trim()) {
                console.log('[Instagram] XML 태그에서 프롬프트 추출:', match[1].substring(0, 50));
                return match[1].trim();
            }

            // 2. XML 태그가 없다면? (Fallback)
            // AI가 지시를 무시하고 태그 목록만 뱉었을 경우를 대비
            // 결과 텍스트가 비어있지 않고, 콤마(,)가 포함되어 있다면 유효한 프롬프트로 간주
            if (resultStr.length > 10 && resultStr.includes(',')) {
                console.log('[Instagram] XML 태그 없음, 원본 텍스트를 프롬프트로 사용:', resultStr.substring(0, 50));
                return resultStr;
            }
            
            console.log('[Instagram] AI 응답이 유효하지 않음:', resultStr.substring(0, 100));
        } catch (e) {
            console.warn('[Instagram] AI 프롬프트 생성 실패:', e);
        }

        // 실패 시 원본 텍스트 반환
        return userInput;
    }

    // ========== 카메라 앱 방식 그대로 ==========
    function getSlashCommandParser() {
        if (window.SlashCommandParser && window.SlashCommandParser.commands) {
            return window.SlashCommandParser;
        }
        
        if (window.SillyTavern) {
            const ctx = typeof window.SillyTavern.getContext === 'function' 
                ? window.SillyTavern.getContext() 
                : window.SillyTavern;
            
            if (ctx && ctx.SlashCommandParser && ctx.SlashCommandParser.commands) {
                return ctx.SlashCommandParser;
            }
        }

        if (typeof SlashCommandParser !== 'undefined' && SlashCommandParser.commands) {
            return SlashCommandParser;
        }

        return null;
    }

    function getExecuteSlashCommand() {
        if (window.SillyTavern) {
            const ctx = typeof window.SillyTavern.getContext === 'function' 
                ? window.SillyTavern.getContext() 
                : window.SillyTavern;
            
            if (ctx && typeof ctx.executeSlashCommands === 'function') {
                return ctx.executeSlashCommands;
            }
            if (ctx && typeof ctx.executeSlashCommand === 'function') {
                return ctx.executeSlashCommand;
            }
        }

        if (typeof executeSlashCommands === 'function') {
            return executeSlashCommands;
        }
        if (typeof executeSlashCommand === 'function') {
            return executeSlashCommand;
        }

        return null;
    }

    async function generateImage(prompt) {
        const parser = getSlashCommandParser();
        if (parser && parser.commands) {
            const sdCmd = parser.commands['sd'] || parser.commands['draw'] || parser.commands['imagine'];
            if (sdCmd && typeof sdCmd.callback === 'function') {
                try {
                    const result = await sdCmd.callback({ quiet: 'true' }, prompt);
                    if (result && typeof result === 'string') {
                        return result;
                    }
                } catch (e) {
                    console.warn("[Instagram] sd.callback 실패:", e);
                }
            }
        }

        const executeCmd = getExecuteSlashCommand();
        if (executeCmd) {
            try {
                const result = await executeCmd(`/sd quiet=true ${prompt}`);
                if (result && result.pipe) {
                    return result.pipe;
                }
                if (typeof result === 'string') {
                    return result;
                }
            } catch (e) {
                console.warn("[Instagram] executeSlashCommands 실패:", e);
            }
        }

        throw new Error("이미지 생성 실패");
    }

    // ========== Pending Comments 조회 ==========
    function getPendingComments(charName) {
        const user = getUserInfo();
        const pendingComments = [];
        
        for (const post of posts) {
            // 1. 캐릭터 본인 게시물 - 유저 댓글에 답글 필요
            if (post.author.toLowerCase() === charName.toLowerCase()) {
                const userComments = post.comments.filter(c => c.author === user.name);
                if (userComments.length > 0) {
                    const lastUserComment = userComments[userComments.length - 1];
                    const hasCharReplyAfter = post.comments.some(c => 
                        c.author.toLowerCase() === charName.toLowerCase() && 
                        c.id > lastUserComment.id
                    );
                    if (!hasCharReplyAfter) {
                        pendingComments.push({
                            postId: post.id,
                            type: 'reply',
                            postCaption: post.caption?.substring(0, 50) || '',
                            imagePrompt: post.imagePrompt || '', // 이미지 설명 추가
                            userComment: lastUserComment.text?.substring(0, 80) || '',
                            commentId: lastUserComment.id
                        });
                    }
                }
                continue;
            }
            
            // 2. 유저 게시물 - 캐릭터 댓글 필요
            if (post.author !== user.name && !post.isUser) continue;
            
            const charComments = post.comments.filter(c => 
                c.author.toLowerCase() === charName.toLowerCase()
            );
            
            if (charComments.length === 0) {
                // 캐릭터 댓글이 없음 → 첫 댓글 필요
                pendingComments.push({
                    postId: post.id,
                    type: 'comment',
                    postCaption: post.caption?.substring(0, 100) || '',
                    imagePrompt: post.imagePrompt || '',
                    userComment: null,
                    commentId: null
                });
            } else {
                // 캐릭터 댓글 있음 → 마지막 댓글이 유저면 답글 필요
                const lastComment = post.comments[post.comments.length - 1];
                if (lastComment && lastComment.author === user.name) {
                    pendingComments.push({
                        postId: post.id,
                        type: 'reply',
                        postCaption: post.caption?.substring(0, 50) || '',
                        imagePrompt: post.imagePrompt || '',
                        userComment: lastComment.text?.substring(0, 80) || '',
                        commentId: lastComment.id
                    });
                }
            }
        }
        
        return pendingComments;
    }

    // ========== 통합 AI 호출 (포스팅 + 댓글 한 번에) ==========
    async function generateAllSocialActivity(charName, personality) {
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        const context = getRecentChatContext();
        const contact = getContactByName(charName);
        
        // visualTags가 없으면 persona에서 추출 시도
        let visualTags = contact?.tags || '';
        if (!visualTags.trim() && contact?.persona) {
            visualTags = extractVisualHints(contact.persona);
        }
        
        // 캘린더 정보
        const calInfo = getCalendarInfo();
        const currentDate = calInfo?.formatted || new Date().toLocaleDateString('ko-KR');
        
        // 기념일 정보
        let eventsInfo = '';
        const Calendar = window.STPhone.Apps?.Calendar;
        if (Calendar?.getEventsOnlyPrompt) {
            const eventsPrompt = Calendar.getEventsOnlyPrompt();
            if (eventsPrompt) {
                eventsInfo = '\n\n' + eventsPrompt;
            }
        }
        
        // Pending Comments 조회
        loadPosts();
        const pendingComments = getPendingComments(charName);
        
        // Pending Comments 섹션 생성 (이미지 정보 포함)
        let pendingCommentsSection = '';
        if (pendingComments.length > 0) {
            const commentsList = pendingComments.map((c, idx) => {
                const imageInfo = c.imagePrompt ? ` [Image: ${c.imagePrompt.substring(0, 60)}...]` : '';
                if (c.type === 'reply') {
                    return `  ${idx + 1}. [Reply Needed] Post: "${c.postCaption}"${imageInfo} / User's comment: "${c.userComment}"`;
                } else {
                    return `  ${idx + 1}. [Comment Needed] User's post: "${c.postCaption}"${imageInfo}`;
                }
            }).join('\n');
            
            pendingCommentsSection = `

### Pending Comments (${pendingComments.length} items)
${commentsList}
Note: [Image: ...] describes what the photo shows. Consider the image content when writing comments.`;
        }
        
        // 통합 프롬프트 - 상세 SD 프롬프트까지 한 번에 생성
        const prompt = `You are ${charName}. Based on the recent chat context, decide your Instagram activity.

### Current Situation
- Date: ${currentDate}${eventsInfo}
- Context Summary: ${context}

### Character Profile
- Name: ${charName}
- Personality: ${personality}
- Visual Tags (MUST USE for selfie): ${visualTags}
${pendingCommentsSection}

### Task
Decide TWO things:
1. **New Post**: Should you post something new? Only if the moment is memorable/emotional/worth sharing.
2. **Comment Replies**: Reply to any pending comments from the list above.

### Output Format (JSON ONLY):
{
    "newPost": {
        "shouldPost": true,
        "caption": "Short casual caption in Korean",
        "imagePrompt": "DETAILED Stable Diffusion prompt with character visual tags"
    },
    "commentReplies": [
        { "index": 1, "text": "Reply in Korean, 1-2 sentences" }
    ]
}

### CRITICAL - imagePrompt Rules:
- For SELFIE: START with character's Visual Tags (${visualTags}), then add pose, scene, lighting
- For SCENERY: Describe the scene without character tags
- Format: "visual tags, pose, scene details, lighting, medium shot, upper body"
- AVOID: close-up, extreme close-up (use medium shot or upper body instead)
- Example selfie: "${visualTags}, selfie, smile, peace sign, cafe background, soft lighting, medium shot, upper body"
- Example scenery: "coffee cup, latte art, wooden table, cafe interior, warm lighting, still life"

### Rules:
- If no post needed: set shouldPost to false, leave caption/imagePrompt empty
- If no pending comments: set commentReplies to empty array []
- Comments should be natural, casual, match your personality`;

        try {
            const result = await generateWithAI(prompt, 600);
            const jsonMatch = String(result || '').match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    return {
                        newPost: {
                            shouldPost: !!parsed.newPost?.shouldPost,
                            caption: parsed.newPost?.caption || '',
                            imagePrompt: parsed.newPost?.imagePrompt || ''
                        },
                        commentReplies: Array.isArray(parsed.commentReplies) ? parsed.commentReplies : [],
                        pendingComments: pendingComments // 원본 데이터도 함께 반환
                    };
                } catch (parseError) {
                    console.warn('[Instagram] JSON 파싱 실패:', parseError.message);
                }
            }
        } catch (e) {
            console.warn('[Instagram] AI 호출 실패:', e);
        }
        
        return { 
            newPost: { shouldPost: false, caption: '', imagePrompt: '' }, 
            commentReplies: [],
            pendingComments: []
        };
    }

    // ========== 기존 generatePostAllInOne (하위 호환) ==========
    async function generatePostAllInOne(charName, personality) {
        const result = await generateAllSocialActivity(charName, personality);
        return {
            shouldPost: result.newPost.shouldPost,
            caption: result.newPost.caption,
            imagePrompt: result.newPost.imagePrompt
        };
    }

    // ========== 통합 SNS 활동 처리 (포스팅 + 댓글 한 번에) ==========
    async function processAllSocialActivity(charName) {
        // 인스타그램 앱 설치 여부 체크
        if (!isInstagramInstalled()) {
            return;
        }
        
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        
        // [수정] instagramPostEnabled = false면 포스팅만 스킵, 댓글은 계속 처리
        const postingEnabled = settings.instagramPostEnabled !== false;
        
        // 댓글 처리 중이면 스킵 (포스팅과 별도로 체크)
        if (isProcessingComments) {
            console.log('[Instagram] 댓글 처리 중, 스킵');
            return;
        }

        // 연락처에서 성격 정보 가져오기
        const personality = getCharacterPersonality(charName);
        
        console.log('[Instagram] 통합 SNS 활동 처리:', { charName, isGeneratingPost });

        isProcessingComments = true;  // 댓글 처리 시작
        
        try {
            // 통합 AI 호출 (포스팅 결정 + 댓글 한 번에)
            const result = await generateAllSocialActivity(charName, personality);
            
            let activityCount = 0;
            
            // 1. 댓글/답글 처리 (포스팅과 별도로 항상 처리)
            if (result.commentReplies && result.commentReplies.length > 0 && result.pendingComments.length > 0) {
                loadPosts();
                const user = getUserInfo();
                
                for (const reply of result.commentReplies) {
                    const idx = (reply.index || 0) - 1;
                    if (idx < 0 || idx >= result.pendingComments.length) continue;
                    
                    const pending = result.pendingComments[idx];
                    const targetPost = posts.find(p => p.id === pending.postId);
                    if (!targetPost) continue;
                    
                    const replyText = reply.text?.trim();
                    if (!replyText || replyText.length < 2) continue;
                    
                    const cleanReply = stripDateTag(replyText);
                    if (!cleanReply || cleanReply.length < 2) continue;
                    
                    targetPost.comments.push({
                        id: Date.now() + idx,
                        author: charName,
                        authorAvatar: getContactAvatar(charName),
                        text: cleanReply,
                        timestamp: getRpTimestamp()
                    });
                    
                    activityCount++;
                    
                    if (pending.type === 'reply') {
                        addHiddenLog(charName, `[Instagram 답글] ${charName}가 ${user.name}의 댓글에 답글을 남겼습니다: "${cleanReply}"`);
                    } else {
                        addHiddenLog(charName, `[Instagram 댓글] ${charName}가 게시물에 댓글을 남겼습니다: "${cleanReply}"`);
                    }
                }
                
                if (activityCount > 0) {
                    savePosts();
                    console.log('[Instagram] 댓글', activityCount, '개 추가 완료');
                }
            }
            
            // 2. 포스팅 처리 (확률 체크 적용, isGeneratingPost로 중복 방지)
            // [수정] postingEnabled가 false면 포스팅 전체 스킵
            if (!postingEnabled) {
                console.log('[Instagram] 자동 포스팅 비활성화 - 댓글만 처리됨');
            } else if (isGeneratingPost) {
                console.log('[Instagram] 포스팅 생성 중, 포스팅만 스킵 (댓글은 처리됨)');
            } else {
                // 절대러 체크: 최근 포스팅 후 30초 내 스킵
                const timeSinceLastPost = Date.now() - lastPostTime;
                if (timeSinceLastPost < POST_COOLDOWN) {
                    console.log('[Instagram] 최근 포스팅 후 30초 내 - 새 포스팅 스킵 (' + Math.round((POST_COOLDOWN - timeSinceLastPost) / 1000) + '초 남음)');
                } else {
                    const chance = settings.instagramPostChance || 15;
                    
                    // 0%면 포스팅 완전 스킵 (댓글만 처리)
                    if (chance === 0) {
                        console.log('[Instagram] 확률 0% - 포스팅 스킵 (댓글만 처리)');
                    } else {
                    const roll = Math.random() * 100;
                    const shouldAttemptPost = roll < chance;  // <= 에서 < 로 변경 (0% 엣지케이스 방지)
                    
                    // 중복 캡션 체크
                    const captionKey = result.newPost.caption?.trim().toLowerCase();
                    const isDuplicate = captionKey && recentPostCaptions.has(captionKey);
                    
                    if (isDuplicate) {
                        console.log('[Instagram] 중복 캡션 감지, 포스팅 스킵:', captionKey);
                    }
                    
                    if (shouldAttemptPost && result.newPost.shouldPost && !isDuplicate) {
                        isGeneratingPost = true;  // 포스팅 시작
                        console.log('[Instagram] 프로액티브 포스팅 생성 중...');
                        
                        try {
                        // 중복 방지용 캡션 저장
                        if (captionKey) {
                            recentPostCaptions.add(captionKey);
                            setTimeout(() => recentPostCaptions.delete(captionKey), 60000);
                        }

                // 이미지 생성 (imagePrompt가 있을 때만)
                // [최적화] generateAllSocialActivity에서 이미 상세 프롬프트 생성됨 - generateDetailedPrompt 호출 제거
                let imageUrl = null;
                const imagePrompt = result.newPost.imagePrompt?.trim() || '';
                
                if (imagePrompt) {
                    try {
                        imageUrl = await generateImage(imagePrompt);
                    } catch (e) {
                        console.warn('[Instagram] 이미지 생성 실패:', e);
                        if (window.toastr) {
                            toastr.warning('이미지 생성에 실패했습니다. 텍스트만 포스팅됩니다.', 'Instagram');
                        }
                    }
                }

                // 게시물 추가 (imagePrompt 포함)
                loadPosts();
                const newPost = {
                    id: Date.now(),
                    author: charName,
                    authorAvatar: getContactAvatar(charName),
                    imageUrl: imageUrl || '',
                    caption: result.newPost.caption,
                    imagePrompt: imagePrompt, // AI가 이미지 내용 인식용
                    timestamp: getRpTimestamp(),
                    likes: Math.floor(Math.random() * 50) + 10,
                    likedByUser: false,
                    comments: [],
                    isUser: false
                };

                posts.unshift(newPost);
                savePosts();
                activityCount++;
                lastPostTime = Date.now();  // 포스팅 시간 기록

                const postType = imageUrl ? '📸 사진' : '💬 텍스트';
                addHiddenLog(charName, `[Instagram 포스팅] ${charName}가 Instagram에 ${postType} 글을 올렸습니다: "${result.newPost.caption}"`);
                
                if (window.toastr) {
                    toastr.info(`📸 ${charName}님이 Instagram에 새 게시물을 올렸습니다`, 'Instagram');
                }
                    } finally {
                        isGeneratingPost = false;  // 포스팅 완료
                    }
                }  // shouldAttemptPost 블록 닫기
                }  // chance !== 0 블록 닫기 (else)
                }  // 쿨다운 체크 블록 닫기
            }  // isGeneratingPost 체크 블록 닫기
            
            // 3. UI 새로고침 (활동이 있었으면)
            if (activityCount > 0 && $('.st-insta-app').length) {
                setTimeout(() => {
                    loadPosts();
                    open();
                }, 100);
            }
            
        } finally {
            isProcessingComments = false;  // 댓글 처리 완료
        }
    }

    // ========== 프로액티브 포스트 (하위 호환 - 통합 함수로 위임) ==========
    async function checkProactivePost(charName) {
        await processAllSocialActivity(charName);
    }

    async function generateCharacterPost(charName, preGeneratedCaption = null) {
        if (isGeneratingPost) return;
        isGeneratingPost = true;

        try {
            loadPosts();
            
            // 연락처에서 캐릭터 이름과 성격 가져오기
            const ctx = window.SillyTavern?.getContext?.();
            const posterName = charName || ctx?.name2 || 'Character';
            const personality = getCharacterPersonality(posterName);
            
            console.log('[Instagram] 캐릭터 포스트 생성:', { posterName, personalityLength: personality.length });

            // 캡션이 없으면 생성
            let caption = preGeneratedCaption;
            if (!caption) {
                const context = getRecentChatContext();
                const template = getPrompt('characterPost');
                const prompt = fillPrompt(template, { 
                    context, 
                    char: posterName, 
                    personality 
                });
                caption = await generateWithAI(prompt, 150);
            }

            if (!caption?.trim()) return;

            // 이미지 생성 (사진 타입 추론)
            const photoType = detectPhotoType(caption, caption);
            const detailedPrompt = await generateDetailedPrompt(
                `${posterName} Instagram photo, ${caption}`,
                posterName,
                photoType
            );
            
            let imageUrl = null;
            try {
                imageUrl = await generateImage(detailedPrompt);
            } catch (e) {
                console.warn('[Instagram] 이미지 생성 실패:', e);
                if (window.toastr) {
                    toastr.warning('이미지 생성에 실패했습니다. 텍스트만 포스팅됩니다.', 'Instagram');
                }
            }

            // 포스트 저장 (imagePrompt 포함)
            const newPost = {
                id: Date.now(),
                author: posterName,
                authorAvatar: getContactAvatar(posterName),
                imageUrl: imageUrl || '',
                caption: caption.trim(),
                imagePrompt: detailedPrompt, // AI가 이미지 내용 인식용
                timestamp: getRpTimestamp(),
                likes: Math.floor(Math.random() * 50) + 10,
                likedByUser: false,
                comments: [],
                isUser: false
            };

            posts.unshift(newPost);
            savePosts();

            addHiddenLog(posterName, `[Instagram 포스팅] ${posterName}가 Instagram에 게시물을 올렸습니다: "${caption}"`);

            if (window.toastr) {
                toastr.info(`📸 ${posterName}님이 Instagram에 새 게시물을 올렸습니다`, 'Instagram');
            }

        } catch (e) {
            console.error('[Instagram] 포스트 생성 실패:', e);
        } finally {
            isGeneratingPost = false;
        }
    }

    // ========== 댓글 시스템 ==========
    let isGeneratingComment = false;
    
    // [개선] 유저 메시지 후 모든 미응답 게시물에 순차적으로 댓글 달기
    async function checkAllPendingComments(charName) {
        if (isGeneratingComment) {
            console.log('[Instagram] 이미 댓글 생성 중 - 스킵');
            return;
        }
        
        isGeneratingComment = true;
        
        try {
            loadPosts();
            const user = getUserInfo();
            
            // 1. 모든 미응답 게시물 수집
            const pendingPosts = [];
            
            for (const post of posts) {
                // 캐릭터 본인 게시물
                if (post.author.toLowerCase() === charName.toLowerCase()) {
                    // 유저 댓글이 있고, 그 이후 캐릭터 답글이 없으면 타겟
                    const userComments = post.comments.filter(c => c.author === user.name);
                    if (userComments.length > 0) {
                        const lastUserComment = userComments[userComments.length - 1];
                        const hasCharReplyAfter = post.comments.some(c => 
                            c.author.toLowerCase() === charName.toLowerCase() && 
                            c.id > lastUserComment.id
                        );
                        if (!hasCharReplyAfter) {
                            pendingPosts.push({
                                post,
                                type: 'reply',
                                replyToText: lastUserComment.text
                            });
                        }
                    }
                    continue;
                }
                
                // 유저 게시물인지 확인
                if (post.author !== user.name && !post.isUser) continue;
                
                // 캐릭터 댓글이 있는지 확인
                const hasCharComment = post.comments.some(c => 
                    c.author.toLowerCase() === charName.toLowerCase()
                );
                
                if (!hasCharComment) {
                    pendingPosts.push({
                        post,
                        type: 'comment',
                        replyToText: null
                    });
                }
            }
            
            console.log('[Instagram] 미응답 게시물:', pendingPosts.length);
            
            if (pendingPosts.length === 0) {
                console.log('[Instagram] 미응답 게시물 없음');
                return;
            }
            
            // 2. 모든 게시물 정보를 하나의 프롬프트로 묶어서 AI에게 요청
            let commentsAdded = 0;
            const commentTasks = pendingPosts.map((item, idx) => {
                if (item.type === 'reply') {
                    return `${idx + 1}. [답글] 게시물: "${item.post.caption?.substring(0, 50) || ''}" / 유저 댓글: "${item.replyToText?.substring(0, 50) || ''}"`;
                } else {
                    return `${idx + 1}. [댓글] 게시물: "${item.post.caption?.substring(0, 100) || ''}"`;
                }
            }).join('\n');
            
            const charInfo = getCharacterInfo();
            const chatHistory = getChatHistory(300);
            
            const batchPrompt = `[System] You are ${charName}.
Personality: ${charInfo.personality || '자연스럽고 친근함'}

### Recent conversation context:
${chatHistory}

### Task:
아래 ${pendingPosts.length}개의 Instagram 게시물에 각각 댓글/답글을 달아주세요.
평소 말투를 유지하고, 1-2문장으로 짧게 작성하세요.

${commentTasks}

### 출력 형식 (반드시 이 형식을 지켜주세요):
1: 댓글 내용
2: 댓글 내용
...`;

            const response = await generateWithAI(batchPrompt, 500);
            console.log('[Instagram] AI 배치 응답:', response);
            
            if (!response || !response.trim()) {
                console.log('[Instagram] AI 응답 없음');
                return;
            }
            
            // 3. 응답 파싱하여 각 게시물에 댓글 추가
            const lines = response.split('\n').filter(l => l.trim());
            
            for (const line of lines) {
                // "1: 댓글 내용" 또는 "1. 댓글 내용" 형식 파싱
                const match = line.match(/^(\d+)[:\.\)]\s*(.+)/);
                if (!match) continue;
                
                const idx = parseInt(match[1]) - 1;
                const commentText = match[2].trim();
                
                if (idx < 0 || idx >= pendingPosts.length) continue;
                if (!commentText || commentText.length < 2 || commentText.includes('[SKIP]')) continue;
                
                const item = pendingPosts[idx];
                const cleanComment = stripDateTag(commentText);
                
                if (!cleanComment || cleanComment.length < 2) continue;
                
                item.post.comments.push({
                    id: Date.now() + idx,
                    author: charName,
                    authorAvatar: getContactAvatar(charName),
                    text: cleanComment,
                    timestamp: getRpTimestamp()
                });
                
                commentsAdded++;
                
                if (item.type === 'reply') {
                    addHiddenLog(charName, `[Instagram 답글] ${charName}가 ${user.name}의 댓글에 답글을 남겼습니다: "${cleanComment}"`);
                } else {
                    addHiddenLog(charName, `[Instagram 댓글] ${charName}가 ${item.post.author}의 게시물에 댓글을 남겼습니다: "${cleanComment}"`);
                }
                
                console.log('[Instagram] 댓글 추가:', cleanComment.substring(0, 30));
            }
            
            // 4. 한 번에 저장
            if (commentsAdded > 0) {
                savePosts();
                console.log('[Instagram] 총', commentsAdded, '개 댓글 저장 완료');
                
                // UI 새로고침
                if ($('.st-insta-app').length) {
                    setTimeout(() => {
                        loadPosts(); // 명시적으로 다시 로드
                        open();
                    }, 100);
                }
                
                if (typeof toastr !== 'undefined') {
                    toastr.info(`${charName}님이 ${commentsAdded}개의 댓글을 달았습니다`);
                }
            }
            
        } catch (e) {
            console.error('[Instagram] 댓글 생성 실패:', e);
        } finally {
            isGeneratingComment = false;
        }
    }
    
    // 기존 함수 유지 (하위 호환)
    async function checkAndGenerateComment(postId, charName) {
        // 새 함수로 위임
        await checkAllPendingComments(charName);
    }

    // ========== 히든 로그 ==========
    function addHiddenLog(sender, content) {
        const ctx = window.SillyTavern?.getContext?.();
        if (!ctx?.chat) return;

        const hiddenMessage = {
            name: sender,
            mes: content,
            is_user: false,
            is_system: false,
            extra: {
                isSmallSys: true,
                force_avatar: false,
                is_phone_log: true,
                type: 'instagram'
            }
        };

        ctx.chat.push(hiddenMessage);

        // 저장
        const parser = ctx.SlashCommandParser || window.SlashCommandParser;
        if (parser?.commands?.['savechat']) {
            parser.commands['savechat'].callback({});
        }
    }

    // ========== 렌더링 함수 ==========
    function open() {
        loadPosts();
        currentPage = 1;

        const $screen = window.STPhone.UI.getContentElement();
        if (!$screen || !$screen.length) return;
        $screen.empty();

        const calInfo = getCalendarInfo();
        const dateDisplay = calInfo ? `<span class="st-insta-header-date">${calInfo.month}월 ${calInfo.day}일 ${calInfo.dayOfWeek.slice(0, 1)}</span>` : '';

        const html = `
            ${css}
            <div class="st-insta-app">
                <div class="st-insta-header">
                    <div class="st-insta-header-left">
                        <div class="st-insta-logo">Instagram</div>
                        ${dateDisplay}
                    </div>
                    <div class="st-insta-header-icons">
                        <i class="fa-regular fa-heart st-insta-header-icon"></i>
                        <i class="fa-regular fa-paper-plane st-insta-header-icon"></i>
                    </div>
                </div>
                <div class="st-insta-feed" id="st-insta-feed">
                    ${renderFeed()}
                </div>
                <div class="st-insta-fab" id="st-insta-fab">
                    <i class="fa-solid fa-plus"></i>
                </div>
            </div>
        `;

        $screen.append(html);
        attachListeners();
    }

    // 스토리 기능 제거됨
    function renderStories() {
        return '';
    }

    function renderFeed() {
        if (posts.length === 0) {
            return `
                <div class="st-insta-empty">
                    <div class="st-insta-empty-icon"><i class="fa-regular fa-image"></i></div>
                    <div class="st-insta-empty-title">게시물이 없습니다</div>
                    <div>+ 버튼을 눌러 첫 게시물을 올려보세요!</div>
                </div>
            `;
        }

        // 페이지네이션 적용
        const visiblePosts = posts.slice(0, currentPage * POSTS_PER_PAGE);
        const hasMore = posts.length > visiblePosts.length;
        
        let html = visiblePosts.map(post => renderPost(post)).join('');
        
        // 더보기 버튼 또는 로딩 스피너
        if (hasMore) {
            html += `
                <div class="st-insta-load-more" id="st-insta-load-more">
                    <div class="st-insta-load-more-text">더 보기</div>
                </div>
            `;
        }
        
        return html;
    }

    function renderPost(post) {
        const likedClass = post.likedByUser ? 'liked' : '';
        const likeIcon = post.likedByUser ? 'fa-solid fa-heart' : 'fa-regular fa-heart';

        let commentsHtml = '';
        if (post.comments && post.comments.length > 0) {
            // 댓글 3개 이상이면 "모두 보기" 표시하고 기본적으로 숨김
            const hasMany = post.comments.length > 2;
            const hiddenClass = hasMany ? 'st-insta-comments-hidden' : '';
            
            if (hasMany) {
                commentsHtml = `<div class="st-insta-post-comments" data-post-id="${post.id}">댓글 ${post.comments.length}개 모두 보기</div>`;
            }
            
            // 모든 댓글을 담는 컨테이너 (3개 이상이면 숨김)
            commentsHtml += `<div class="st-insta-comments-list st-insta-all-comments ${hiddenClass}" data-post-id="${post.id}">`;
            post.comments.forEach(c => {
                commentsHtml += `
                    <div class="st-insta-comment-item">
                        <span><strong class="st-insta-comment-author">${escapeHtml(c.author)}</strong>${escapeHtml(c.text)}</span>
                    </div>
                `;
            });
            commentsHtml += '</div>';
            
            // 3개 이상일 때 최근 2개만 보이는 미리보기
            if (hasMany) {
                const recentComments = post.comments.slice(-2);
                commentsHtml += `<div class="st-insta-comments-list st-insta-preview-comments" data-post-id="${post.id}">`;
                recentComments.forEach(c => {
                    commentsHtml += `
                        <div class="st-insta-comment-item">
                            <span><strong class="st-insta-comment-author">${escapeHtml(c.author)}</strong>${escapeHtml(c.text)}</span>
                        </div>
                    `;
                });
                commentsHtml += '</div>';
            }
        }

        // 이미지가 있을 때만 표시
        const imageHtml = post.imageUrl 
            ? `<img class="st-insta-post-image" src="${post.imageUrl}" alt="" loading="lazy">`
            : '';

        return `
            <div class="st-insta-post" data-post-id="${post.id}">
                <div class="st-insta-post-header">
                    <img class="st-insta-post-avatar" src="${post.authorAvatar || getContactAvatar(post.author)}" alt="">
                    <span class="st-insta-post-author" data-author="${escapeHtml(post.author)}">${escapeHtml(post.author)}</span>
                    <i class="fa-solid fa-ellipsis st-insta-post-more" data-post-id="${post.id}"></i>
                </div>
                ${imageHtml}
                <div class="st-insta-post-actions">
                    <i class="${likeIcon} st-insta-post-action ${likedClass}" data-action="like" data-post-id="${post.id}"></i>
                    <i class="fa-regular fa-comment st-insta-post-action" data-action="comment" data-post-id="${post.id}"></i>
                    <i class="fa-regular fa-paper-plane st-insta-post-action"></i>
                    <i class="fa-regular fa-bookmark st-insta-post-action st-insta-post-bookmark"></i>
                </div>
                <div class="st-insta-post-likes">좋아요 ${post.likes + (post.likedByUser ? 1 : 0)}개</div>
                <div class="st-insta-post-caption">
                    <strong>${escapeHtml(post.author)}</strong>${escapeHtml(post.caption)}
                </div>
                ${commentsHtml}
                <div class="st-insta-post-time">${formatTimeAgo(post.timestamp)}</div>
                <div class="st-insta-comment-input">
                    <input type="text" placeholder="댓글 달기..." data-post-id="${post.id}">
                    <span class="st-insta-comment-btn" data-post-id="${post.id}">게시</span>
                </div>
            </div>
        `;
    }

    function openCreateScreen() {
        const $app = $('.st-insta-app');
        
        const createHtml = `
            <div class="st-insta-create" id="st-insta-create">
                <div class="st-insta-create-header">
                    <span class="st-insta-create-cancel" id="st-insta-create-cancel">✕</span>
                    <span class="st-insta-create-title">새 게시물</span>
                    <span class="st-insta-create-next" id="st-insta-create-share">공유</span>
                </div>
                <div class="st-insta-create-content" style="overflow-y: auto;">
                    <div class="st-insta-create-preview" id="st-insta-create-preview">
                        <i class="fa-regular fa-image"></i>
                        <div style="font-size: 12px; color: var(--pt-sub-text, #8e8e8e); margin-top: 8px;">공유 시 자동 생성됩니다</div>
                    </div>
                    
                    <div style="background: var(--pt-card-bg, #fff); border-radius: 12px; padding: 14px; margin-bottom: 12px;">
                        <div style="font-size: 13px; font-weight: 600; color: var(--pt-sub-text, #8e8e8e); margin-bottom: 8px;">
                            <i class="fa-solid fa-wand-magic-sparkles" style="margin-right: 6px;"></i>이미지 생성 프롬프트
                        </div>
                        <textarea class="st-insta-create-prompt" id="st-insta-create-prompt" 
                                  placeholder="예: 카페에서 커피 마시는 셀카, 창밖 비오는 날씨"
                                  style="min-height: 60px;"></textarea>
                    </div>
                    
                    <div style="background: var(--pt-card-bg, #fff); border-radius: 12px; padding: 14px;">
                        <div style="font-size: 13px; font-weight: 600; color: var(--pt-sub-text, #8e8e8e); margin-bottom: 8px;">
                            <i class="fa-regular fa-pen-to-square" style="margin-right: 6px;"></i>피드 캡션
                        </div>
                        <textarea class="st-insta-create-caption" id="st-insta-create-caption" 
                                  placeholder="예: 오늘의 커피 ☕ #카페스타그램 #일상"
                                  style="min-height: 80px;"></textarea>
                    </div>
                </div>
            </div>
        `;

        $app.append(createHtml);
        attachCreateListeners();
    }

    let scrollThrottle = null;

    function attachListeners() {
        // 새 게시물 (FAB 버튼)
        $('#st-insta-fab').off('click').on('click', openCreateScreen);

        // 이벤트 위임 방식으로 변경 (새로 추가되는 게시물에도 자동 적용)
        const $feed = $('#st-insta-feed');
        
        // 좋아요
        $feed.off('click', '.st-insta-post-action[data-action="like"]')
            .on('click', '.st-insta-post-action[data-action="like"]', function() {
                const postId = parseInt($(this).data('post-id'));
                toggleLike(postId);
            });

        // 댓글 입력
        $feed.off('input', '.st-insta-comment-input input')
            .on('input', '.st-insta-comment-input input', function() {
                const val = $(this).val().trim();
                const postId = $(this).data('post-id');
                $(`.st-insta-comment-btn[data-post-id="${postId}"]`).toggleClass('active', val.length > 0);
            });

        // 댓글 엔터키로 게시
        $feed.off('keydown', '.st-insta-comment-input input')
            .on('keydown', '.st-insta-comment-input input', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    e.stopPropagation(); // 이벤트 버블링 방지
                    e.stopImmediatePropagation(); // 다른 핸들러 실행 방지
                    const postId = parseInt($(this).data('post-id'));
                    const text = $(this).val().trim();
                    if (text) {
                        addUserComment(postId, text);
                        $(this).val('');
                        $(`.st-insta-comment-btn[data-post-id="${postId}"]`).removeClass('active');
                    }
                    return false; // jQuery에서 추가 이벤트 중단
                }
            });

        // 댓글 게시 버튼
        $feed.off('click', '.st-insta-comment-btn')
            .on('click', '.st-insta-comment-btn', function() {
                const postId = parseInt($(this).data('post-id'));
                const $input = $(`.st-insta-comment-input input[data-post-id="${postId}"]`);
                const text = $input.val().trim();
                
                if (text) {
                    addUserComment(postId, text);
                    $input.val('');
                    $(this).removeClass('active');
                }
            });

        // 프로필 보기
        $feed.off('click', '.st-insta-post-author')
            .on('click', '.st-insta-post-author', function() {
                const name = $(this).data('author');
                openProfile(name);
        });

        // 댓글 모두 보기 클릭 - 아래로 펼치기
        $feed.off('click', '.st-insta-post-comments')
            .on('click', '.st-insta-post-comments', function() {
                const postId = parseInt($(this).data('post-id'));
                const $allComments = $(`.st-insta-all-comments[data-post-id="${postId}"]`);
                const $previewComments = $(`.st-insta-preview-comments[data-post-id="${postId}"]`);
                
                // 전체 댓글 보이고, 미리보기 숨기고, "모두 보기" 버튼 숨김
                $allComments.removeClass('st-insta-comments-hidden');
                $previewComments.addClass('st-insta-comments-hidden');
                $(this).hide();
            });

        // 더보기 메뉴
        $feed.off('click', '.st-insta-post-more')
            .on('click', '.st-insta-post-more', function() {
                const postId = parseInt($(this).data('post-id'));
                showPostMenu(postId);
            });

        // 무한스크롤 - 더보기 버튼 클릭 (이벤트 위임)
        $feed.off('click', '.st-insta-load-more')
            .on('click', '.st-insta-load-more', loadMorePosts);

        // 무한스크롤 - 스크롤 감지 (쓰로틀링 적용)
        $feed.off('scroll').on('scroll', function() {
            if (scrollThrottle) return;
            scrollThrottle = setTimeout(() => {
                scrollThrottle = null;
                
                const scrollTop = $feed.scrollTop();
                const scrollHeight = $feed[0].scrollHeight;
                const clientHeight = $feed[0].clientHeight;
                
                // 스크롤이 하단 근처(100px)에 도달하면 더 로드
                if (scrollTop + clientHeight >= scrollHeight - 100 && !isLoadingMore) {
                    const hasMore = posts.length > currentPage * POSTS_PER_PAGE;
                    if (hasMore) {
                        loadMorePosts();
                    }
                }
            }, 100);
        });
    }

    // 무한스크롤 - 더 로드
    function loadMorePosts() {
        if (isLoadingMore) return;
        
        const hasMore = posts.length > currentPage * POSTS_PER_PAGE;
        if (!hasMore) return;
        
        isLoadingMore = true;
        currentPage++;
        
        // 새 게시물들 렌더링
        const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
        const endIndex = currentPage * POSTS_PER_PAGE;
        const newPosts = posts.slice(startIndex, endIndex);
        
        // 더보기 버튼 제거
        $('#st-insta-load-more').remove();
        
        // 새 게시물 추가
        const $feed = $('#st-insta-feed');
        newPosts.forEach(post => {
            $feed.append(renderPost(post));
        });
        
        // 더 있으면 더보기 버튼 다시 추가
        if (posts.length > currentPage * POSTS_PER_PAGE) {
            $feed.append(`
                <div class="st-insta-load-more" id="st-insta-load-more">
                    <div class="st-insta-load-more-text">더 보기</div>
                </div>
            `);
        }
        
        // 이벤트 위임으로 처리되므로 별도 리스너 연결 불필요
        
        isLoadingMore = false;
    }

    function attachCreateListeners() {
        // 취소
        $('#st-insta-create-cancel').off('click').on('click', function() {
            $('#st-insta-create').remove();
        });

        // 엔터키로 공유
        $('#st-insta-create-prompt, #st-insta-create-caption').off('keydown').on('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                $('#st-insta-create-share').click();
            }
        });

        // 공유 (이미지 생성 + 게시 자동)
        $('#st-insta-create-share').off('click').on('click', async function() {
            const prompt = $('#st-insta-create-prompt').val().trim();
            const caption = $('#st-insta-create-caption').val().trim() || '📸';
            const user = getUserInfo();

            if (!prompt && !caption) {
                toastr.warning('프롬프트나 캡션 중 하나는 입력해주세요');
                return;
            }

            const $btn = $(this);
            const $preview = $('#st-insta-create-preview');
            
            let imageUrl = null;
            let savedImagePrompt = ''; // 이미지 프롬프트 저장용

            try {
                // 프롬프트가 있으면 이미지 생성
                if (prompt) {
                    $btn.addClass('disabled').text('생성 중...');
                    $preview.html('<div class="st-insta-spinner"></div><div style="font-size: 12px; color: var(--pt-sub-text, #8e8e8e); margin-top: 8px;">이미지 생성 중...</div>');

                    // AI 프롬프트 상세화 후 이미지 생성 (카메라/메신저와 동일)
                    // [FIX] user.name 대신 character.name 사용, photoType 추가
                    const character = getCharacterInfo();
                    const photoType = detectPhotoType(prompt, caption);
                    const detailedPrompt = await generateDetailedPrompt(prompt, character.name, photoType);
                    savedImagePrompt = detailedPrompt; // 프롬프트 저장
                    imageUrl = await generateImage(detailedPrompt);

                    if (!imageUrl) {
                        throw new Error('이미지 생성 실패');
                    }

                    $preview.html(`<img src="${imageUrl}" alt="">`);
                    toastr.success('이미지 생성 완료! 게시 중...');
                } else {
                    // 이미지 없이 텍스트만 게시
                    $btn.addClass('disabled').text('게시 중...');
                }

                // 포스트 추가 (imagePrompt 포함)
                const newPost = {
                    id: Date.now(),
                    author: user.name,
                    authorAvatar: user.avatar,
                    imageUrl: imageUrl || '',
                    caption: caption,
                    imagePrompt: savedImagePrompt, // AI가 이미지 내용을 인식할 수 있도록 저장
                    timestamp: getRpTimestamp(),
                    likes: 0,
                    likedByUser: false,
                    comments: [],
                    isUser: true
                };

                loadPosts();
                posts.unshift(newPost);
                savePosts();

                // 히든 로그 (이미지 정보 포함)
                const imageInfo = savedImagePrompt ? ` [Image: ${savedImagePrompt.substring(0, 50)}...]` : '';
                addHiddenLog(user.name, `[Instagram 포스팅] ${user.name}가 Instagram에 게시물을 올렸습니다: "${caption}"${imageInfo}`);

                toastr.success('게시물이 업로드되었습니다!');
                
                // 화면 새로고침
                $('#st-insta-create').remove();
                open();

                // [수정] 캐릭터 댓글은 통합 AI 호출(processAllSocialActivity)에서 처리됨
                // 별도 API 호출 제거로 효율성 개선

            } catch (e) {
                $preview.html('<i class="fa-regular fa-image"></i><div style="font-size: 12px; color: var(--pt-sub-text, #8e8e8e); margin-top: 8px;">공유 시 자동 생성됩니다</div>');
                $btn.removeClass('disabled').text('공유');
                toastr.error('이미지 생성에 실패했습니다');
            }
        });
    }

    function toggleLike(postId) {
        loadPosts();
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        post.likedByUser = !post.likedByUser;
        savePosts();

        // UI 업데이트
        const $icon = $(`.st-insta-post-action[data-action="like"][data-post-id="${postId}"]`);
        if (post.likedByUser) {
            $icon.removeClass('fa-regular').addClass('fa-solid liked');
        } else {
            $icon.removeClass('fa-solid liked').addClass('fa-regular');
        }

        const $likes = $icon.closest('.st-insta-post').find('.st-insta-post-likes');
        $likes.text(`좋아요 ${post.likes + (post.likedByUser ? 1 : 0)}개`);
    }

    function addUserComment(postId, text) {
        loadPosts();
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        const user = getUserInfo();

        post.comments.push({
            id: Date.now(),
            author: user.name,
            authorAvatar: user.avatar,
            text: text,
            timestamp: getRpTimestamp()
        });

        savePosts();

        // 히든 로그
        addHiddenLog(user.name, `[Instagram 댓글] ${user.name}가 ${post.author}의 게시물에 댓글을 남겼습니다: "${text}"`);

        // UI 새로고침
        open();
        
        // [효율화] 캐릭터 답댓글은 다음 메시지 때 processAllSocialActivity에서 통합 처리됨
        // 별도 API 호출하지 않음
    }

    async function checkCharacterReplyToComment(postId, charName, commenterName, commentText) {
        loadPosts();
        const post = posts.find(p => p.id === postId);
        if (!post || post.author.toLowerCase() !== charName.toLowerCase()) return;

        // 연락처에서 성격 정보 가져오기
        const personality = getCharacterPersonality(charName);

        const prompt = `You are ${charName} on Instagram. ${commenterName} commented on your post: "${commentText}"
Your post caption was: "${post.caption}"
Personality: ${personality}

Write a short reply comment (1 sentence). Output ONLY the reply text, no quotes.`;

        const reply = await generateWithAI(prompt, 80);
        if (!reply?.trim()) return;

        // 답글 추가 (날짜 태그 제거)
        const cleanReply = stripDateTag(reply.trim());
        post.comments.push({
            id: Date.now(),
            author: charName,
            authorAvatar: getContactAvatar(charName),
            text: cleanReply,
            timestamp: getRpTimestamp()
        });

        savePosts();
        addHiddenLog(charName, `[Instagram 답글] ${charName}가 ${commenterName}의 댓글에 답글을 남겼습니다: "${cleanReply}"`);
    }

    function openProfile(name) {
        loadPosts();
        const userPosts = posts.filter(p => p.author.toLowerCase() === name.toLowerCase());
        const avatar = getContactAvatar(name);

        const profileHtml = `
            <div class="st-insta-profile" id="st-insta-profile">
                <div class="st-insta-profile-header">
                    <i class="fa-solid fa-arrow-left st-insta-profile-back"></i>
                    <span class="st-insta-profile-name">${escapeHtml(name)}</span>
                </div>
                <div class="st-insta-profile-content">
                    <div class="st-insta-profile-info">
                        <img class="st-insta-profile-avatar" src="${avatar}" alt="">
                        <div class="st-insta-profile-stats">
                            <div class="st-insta-profile-stat">
                                <div class="st-insta-profile-stat-num">${userPosts.length}</div>
                                <div class="st-insta-profile-stat-label">게시물</div>
                            </div>
                        </div>
                    </div>
                    <div class="st-insta-profile-grid">
                        ${userPosts.map(p => `
                            <div class="st-insta-profile-grid-item" data-post-id="${p.id}">
                                <img src="${p.imageUrl}" alt="">
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        $('.st-insta-app').append(profileHtml);

        $('.st-insta-profile-back').on('click', () => {
            $('#st-insta-profile').remove();
        });
    }

    function showPostMenu(postId) {
        loadPosts();
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        // 모든 게시물 삭제 가능 (내 게시물/캐릭터 게시물 모두)
        const menuItems = ['삭제', '취소'];

        const choice = prompt(`게시물 옵션:\n1. ${menuItems[0]}\n2. ${menuItems[1]}\n\n번호를 입력하세요:`);

        if (choice === '1') {
            posts = posts.filter(p => p.id !== postId);
            savePosts();
            toastr.info('게시물이 삭제되었습니다');
            open();
        }
    }

    // ========== 처리된 메시지 영구 저장 (localStorage) ==========
    const PROCESSED_MSG_KEY = 'stphone_instagram_processed_msgs';
    
    function getProcessedMsgIds() {
        try {
            const chatId = getCurrentChatId();
            const data = JSON.parse(localStorage.getItem(PROCESSED_MSG_KEY) || '{}');
            return new Set(data[chatId] || []);
        } catch { 
            return new Set(); 
        }
    }
    
    function saveProcessedMsgId(msgId) {
        try {
            const chatId = getCurrentChatId();
            const data = JSON.parse(localStorage.getItem(PROCESSED_MSG_KEY) || '{}');
            const ids = new Set(data[chatId] || []);
            ids.add(msgId);
            // 채팅당 최근 500개만 유지
            data[chatId] = [...ids].slice(-500);
            // 전체 채팅 수 제한 (최근 50개 채팅만 유지)
            const chatKeys = Object.keys(data);
            if (chatKeys.length > 50) {
                const oldestKey = chatKeys[0];
                delete data[oldestKey];
            }
            localStorage.setItem(PROCESSED_MSG_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('[Instagram] 처리된 메시지 저장 실패:', e);
        }
    }
    
    function getCurrentChatId() {
        const ctx = window.SillyTavern?.getContext?.();
        // 캐릭터 이름 + 채팅 파일명으로 고유 ID 생성
        const charName = ctx?.name2 || 'unknown';
        const chatFile = ctx?.getCurrentChatId?.() || ctx?.chat?.length || 0;
        return `${charName}_${chatFile}`;
    }

    // ========== 이벤트 리스너 초기화 ==========
    let listenerRegistered = false;
    // [수정] 채팅 로드 시간을 기록 - 로드 직후 기존 메시지에 반응하지 않기 위함
    let chatLoadedTime = Date.now();
    const CHAT_LOAD_COOLDOWN = 3000; // 채팅 로드 후 3초간 포스팅 방지
    
    function initProactivePostListener() {
        console.log('[Instagram] initProactivePostListener 호출됨');
        
        if (listenerRegistered) {
            console.log('[Insta gram] 리스너 이미 등록됨');
            return;
        }
        
        // 인스타그램 앱 설치 여부 체크
        if (!isInstagramInstalled()) {
            console.log('[Instagram] 앱 미설치 - 프로액티브 리스너 등록 안 함');
            // 나중에 설치될 수 있으므로 주기적으로 재체크
            setTimeout(initProactivePostListener, 10000);
            return;
        }
        
        console.log('[Instagram] 리스너 등록 시작...');
        
        const checkInterval = setInterval(() => {
            const ctx = window.SillyTavern?.getContext?.();
            if (!ctx) return;

            clearInterval(checkInterval);

            const { eventSource, eventTypes } = ctx;

            if (eventSource && eventTypes?.MESSAGE_RECEIVED) {
                listenerRegistered = true;
                
                // 초기 마지막 메시지 ID 저장
                const ctx = window.SillyTavern.getContext();
                let lastProcessedMsgId = ctx?.chat?.length || 0;
                
                // [핵심 수정] 처리된 메시지 인덱스 Set - 영구적 중복 방지
                const processedMessageIndices = new Set();
                // 기존 메시지들은 모두 처리됨으로 마킹
                for (let i = 0; i < lastProcessedMsgId; i++) {
                    processedMessageIndices.add(i);
                }
                
                // [수정] 초기 로드 시간 설정
                chatLoadedTime = Date.now();
                
                eventSource.on(eventTypes.MESSAGE_RECEIVED, (messageId) => {
                    setTimeout(() => {
                        const c = window.SillyTavern.getContext();
                        if (!c?.chat || c.chat.length === 0) return;
                        
                        // [핵심 수정] 채팅 로드 후 쿨다운 체크 - 페이지 새로고침/채팅 전환 직후 자동 포스팅 방지
                        const timeSinceLoad = Date.now() - chatLoadedTime;
                        if (timeSinceLoad < CHAT_LOAD_COOLDOWN) {
                            console.log('[Instagram] 채팅 로드 직후 쿨다운 중 - 스킵 (', timeSinceLoad, 'ms)');
                            // 기존 메시지들 모두 처리됨으로 마킹
                            for (let i = 0; i < c.chat.length; i++) {
                                processedMessageIndices.add(i);
                            }
                            lastProcessedMsgId = c.chat.length;
                            return;
                        }
                        
                        // messageId가 숫자면 해당 인덱스 사용, 아니면 마지막 메시지 인덱스
                        const targetIndex = typeof messageId === 'number' ? messageId : c.chat.length - 1;
                        
                        // 이미 처리한 메시지면 스킵 (메모리)
                        if (processedMessageIndices.has(targetIndex)) {
                            console.log('[Instagram] 이미 처리된 메시지 인덱스 - 스킵:', targetIndex);
                            return;
                        }
                        
                        // [핵심] localStorage 영구 체크 - 재접속해도 다시 파싱 안 함
                        const persistentMsgId = `${targetIndex}_${c.chat[targetIndex]?.mes?.substring(0, 50) || ''}`;
                        if (getProcessedMsgIds().has(persistentMsgId)) {
                            console.log('[Instagram] 영구 저장된 메시지 - 스킵:', targetIndex);
                            processedMessageIndices.add(targetIndex);
                            return;
                        }
                        
                        // 처리됨으로 마킹 (메모리 + localStorage)
                        processedMessageIndices.add(targetIndex);
                        saveProcessedMsgId(persistentMsgId);
                        lastProcessedMsgId = Math.max(lastProcessedMsgId, c.chat.length);
                        
                        // [추가] 유저 메시지가 하나도 없으면 스킵 (그리팅/초기 메시지)
                        const userMsgCount = c.chat.reduce((count, m) => count + (m?.is_user ? 1 : 0), 0);
                        if (userMsgCount === 0) {
                            console.log('[Instagram] 그리팅/초기 메시지 스킵 - 유저 메시지 없음');
                            return;
                        }
                        
                        // 정확한 메시지 가져오기
                        const targetMsg = c.chat[targetIndex];
                        if (targetMsg && !targetMsg.is_user) {
                            console.log('[Instagram] 메시지 처리:', targetIndex, targetMsg.name);
                            // [중요] 채팅 태그 파싱 (별도 처리)
                            parseInstagramFromChat(targetMsg.name, targetMsg.mes);
                            // [통합] 포스팅 + 댓글 한 번에 처리
                            checkProactivePost(targetMsg.name);
                        }
                    }, 500);
                });
                
                // 채팅 변경 시 플래그 리셋 및 데이터 리로드
                if (eventTypes.CHAT_CHANGED) {
                    eventSource.on(eventTypes.CHAT_CHANGED, () => {
                        console.log('[Instagram] 채팅 변경 감지 - 데이터 리로드');
                        initialLoadComplete = false;
                        lastMessageIdOnLoad = -1;
                        // [수정] 채팅 로드 시간 재설정
                        chatLoadedTime = Date.now();
                        // 새 채팅의 메시지 수 저장
                        const c = window.SillyTavern.getContext();
                        lastProcessedMsgId = c?.chat?.length || 0;
                        // [NEW] 새 채팅에 맞는 포스트 데이터 리로드
                        loadPosts();
                        setTimeout(() => { initialLoadComplete = true; }, 2000);
                    });
                }
            }
            
            // Phone.js와 동일: MutationObserver로 DOM 직접 감시 (태그 숨기기만)
            startInstagramObserver();
        }, 1000);
    }
    
    // 초기 로드 완료 플래그 - 이전 메시지에 토스트 안 띄우기 위함
    let initialLoadComplete = false;
    // 초기화 시점의 마지막 메시지 ID 저장
    let lastMessageIdOnLoad = -1;
    
    // Phone.js 방식: 채팅창 DOM 감시
    function startInstagramObserver() {
        console.log('[Instagram] startInstagramObserver 호출됨');
        
        // 인스타그램 앱 설치 여부 체크
        if (!isInstagramInstalled()) {
            console.log('[Instagram] 앱 미설치 - Observer 시작 안 함');
            return;
        }
        
        const chatRoot = document.getElementById('chat');
        if (!chatRoot) {
            console.log('[Instagram] chat 요소 없음 - 2초 후 재시도');
            setTimeout(startInstagramObserver, 2000);
            return;
        }
        
        console.log('[Instagram] Observer 등록 성공');

        // 기존 메시지들 먼저 태그만 제거 (토스트 없이, 포스트 생성 없이)
        const existingMsgs = chatRoot.querySelectorAll('.mes');
        existingMsgs.forEach(msg => {
            cleanInstagramTags(msg);
            // 마지막 메시지 ID 기록
            const mesId = parseInt(msg.getAttribute('mesid')) || 0;
            if (mesId > lastMessageIdOnLoad) {
                lastMessageIdOnLoad = mesId;
            }
        });
        
        console.log('[Instagram] 초기 로드 완료, 마지막 메시지 ID:', lastMessageIdOnLoad);
        
        // 초기 로드 완료 - 이후 새 메시지만 토스트
        setTimeout(() => { initialLoadComplete = true; }, 1000);

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.classList.contains('mes')) {
                        // 메시지 ID로 새 메시지인지 확인
                        const mesId = parseInt(node.getAttribute('mesid')) || 0;
                        const isNewMessage = mesId > lastMessageIdOnLoad;
                        
                        if (initialLoadComplete && isNewMessage) {
                            checkMessageForInstagram(node);
                        } else {
                            cleanInstagramTags(node);
                        }
                    }
                });
            });
        });

        observer.observe(chatRoot, { childList: true, subtree: false });
    }
    
    // 태그만 제거 (토스트/게시물 생성 없이)
    // ========== Instagram 태그 정리 함수 ==========
    function cleanInstagramTags(msgNode) {
        if (msgNode.dataset.instagramCleaned) return;
        const textDiv = msgNode.querySelector('.mes_text');
        if (!textDiv) return;
        
        // HTML 엔티티 디코딩 후 처리
        let html = decodeHtmlEntities(textDiv.innerHTML);
        let modified = false;
        
        // Instagram 패턴
        if (html.includes('[IG_POST]')) {
            html = html.replace(INSTAGRAM_PATTERNS.fixedPostGlobal, '');
            modified = true;
        }
        if (html.includes('[IG_REPLY]')) {
            html = html.replace(INSTAGRAM_PATTERNS.fixedReplyGlobal, '');
            modified = true;
        }
        
        // 괄호 형식
        if (html.includes('(Instagram:')) {
            html = html.replace(INSTAGRAM_PATTERNS.parenPostGlobal, '');
            modified = true;
        }
        
        // 기존 레거시 패턴
        if (html.includes('[Instagram 포스팅]')) {
            html = html.replace(INSTAGRAM_PATTERNS.legacyPostGlobal, '');
            modified = true;
        }
        if (html.includes('[Instagram 답글]')) {
            html = html.replace(INSTAGRAM_PATTERNS.legacyReplyGlobal, '');
            modified = true;
        }
        if (html.includes('[Instagram 댓글]')) {
            html = html.replace(INSTAGRAM_PATTERNS.legacyCommentGlobal, '');
            modified = true;
        }
        if (html.includes('[IG_COMMENT]')) {
            html = html.replace(INSTAGRAM_PATTERNS.fixedCommentGlobal, '');
            modified = true;
        }
        
        if (modified) {
            textDiv.innerHTML = html.trim();
        }
        msgNode.dataset.instagramCleaned = "true";
        msgNode.dataset.instagramChecked = "true";
    }

    // ========== Instagram 메시지 처리 (Observer용) ==========
    // 메시지가 DOM에 추가되자마자 태그 숨김 + 데이터 추출을 동시에 처리
    function processInstagramMessage(msgNode) {
        // 중복 처리 방지
        if (msgNode.dataset.instagramProcessed) return;
        
        // 인스타그램 앱 설치 여부 체크
        if (!isInstagramInstalled()) return;
        
        if (msgNode.getAttribute('is_user') === 'true') return;
        if (msgNode.classList.contains('st-phone-hidden-log') || msgNode.style.display === 'none') return;

        const textDiv = msgNode.querySelector('.mes_text');
        if (!textDiv) return;

        // HTML 엔티티 디코딩
        let html = decodeHtmlEntities(textDiv.innerHTML);
        const originalHtml = html;
        let modified = false;
        
        // 캐릭터 이름 가져오기 (포스트 생성용)
        const nameDiv = msgNode.querySelector('.name_text, .ch_name');
        const charName = nameDiv?.textContent?.trim() || getCharacterInfo()?.name || 'Unknown';
        
        // instagramPostEnabled 설정 체크 (포스팅만 체크, 댓글/답글은 항상 허용)
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        const postingEnabled = settings.instagramPostEnabled !== false;
        
        // [중요] 태그 제거 전에 포스트/댓글 생성 먼저!
        // 1. [IG_POST] Instagram 포스팅 (설정 체크)
        const igPostMatch = originalHtml.match(INSTAGRAM_PATTERNS.fixedPost);
        if (igPostMatch && igPostMatch[1] && postingEnabled) {
            createPostFromChat(charName, igPostMatch[1].trim());
        }
        
        // 2. [IG_REPLY] 답글 (항상 허용 - 인스타 깔려있으면 댓글 기능은 무조건 활성화)
        const igReplyMatch = originalHtml.match(INSTAGRAM_PATTERNS.fixedReply);
        if (igReplyMatch && igReplyMatch[1]) {
            addReplyFromChat(charName, igReplyMatch[1].trim());
        }
        
        // 3. [IG_COMMENT] 댓글 (항상 허용)
        const igCommentMatch = originalHtml.match(INSTAGRAM_PATTERNS.fixedComment);
        if (igCommentMatch && igCommentMatch[1]) {
            addCommentFromChat(charName, igCommentMatch[1].trim());
        }
        
        // 4. 레거시 패턴들
        const parenPostMatch = originalHtml.match(INSTAGRAM_PATTERNS.parenPost);
        if (parenPostMatch && parenPostMatch[1] && postingEnabled) {
            createPostFromChat(charName, parenPostMatch[1].trim());
        }
        
        const legacyPostMatch = originalHtml.match(INSTAGRAM_PATTERNS.legacyPost);
        if (legacyPostMatch && legacyPostMatch[1] && postingEnabled) {
            createPostFromChat(charName, legacyPostMatch[1].trim());
        }
        
        const legacyReplyMatch = originalHtml.match(INSTAGRAM_PATTERNS.legacyReply);
        if (legacyReplyMatch && legacyReplyMatch[1]) {
            addReplyFromChat(charName, legacyReplyMatch[1].trim());
        }
        
        const legacyCommentMatch = originalHtml.match(INSTAGRAM_PATTERNS.legacyComment);
        if (legacyCommentMatch && legacyCommentMatch[1]) {
            addCommentFromChat(charName, legacyCommentMatch[1].trim());
        }
        
        // 이제 태그 제거
        // 1. [IG_POST] 태그 제거
        if (html.includes('[IG_POST]')) {
            html = html.replace(INSTAGRAM_PATTERNS.fixedPostGlobal, '');
            modified = true;
        }
        
        // 2. [IG_REPLY] 태그
        if (html.includes('[IG_REPLY]')) {
            html = html.replace(INSTAGRAM_PATTERNS.fixedReplyGlobal, '');
            modified = true;
        }
        
        // 3. 레거시 패턴들
        if (html.includes('(Instagram:')) {
            html = html.replace(INSTAGRAM_PATTERNS.parenPostGlobal, '');
            modified = true;
        }
        
        if (html.includes('[Instagram 포스팅]')) {
            html = html.replace(INSTAGRAM_PATTERNS.legacyPostGlobal, '');
            modified = true;
        }
        
        if (html.includes('[Instagram 답글]')) {
            html = html.replace(INSTAGRAM_PATTERNS.legacyReplyGlobal, '');
            modified = true;
        }
        
        if (html.includes('[Instagram 댓글]')) {
            html = html.replace(INSTAGRAM_PATTERNS.legacyCommentGlobal, '');
            modified = true;
        }
        
        if (html.includes('[IG_COMMENT]')) {
            html = html.replace(INSTAGRAM_PATTERNS.fixedCommentGlobal, '');
            modified = true;
        }
        
        // HTML 업데이트 (태그가 제거된 깨끗한 텍스트로 변경)
        if (modified) {
            textDiv.innerHTML = html.trim();
        }
        msgNode.dataset.instagramProcessed = "true";
        msgNode.dataset.instagramCleaned = "true";
        msgNode.dataset.instagramChecked = "true";
    }

    // 하위 호환을 위한 별칭
    function checkMessageForInstagram(msgNode) {
        processInstagramMessage(msgNode);
    }
    
    // 레거시 별칭
    function processSNSMessage(msgNode) {
        processInstagramMessage(msgNode);
    }

    // 채팅에서 Instagram 포스팅/답글 감지
    function parseInstagramFromChat(charName, message) {
        if (!message) return;
        
        // 인스타그램 앱 설치 여부 체크
        if (!isInstagramInstalled()) return;
        
        // HTML 엔티티 디코딩
        const decodedMessage = decodeHtmlEntities(message);
        
        // 1. [IG_POST] Instagram 포스팅
        const igPostMatch = decodedMessage.match(INSTAGRAM_PATTERNS.fixedPost);
        if (igPostMatch && igPostMatch[1]) {
            createPostFromChat(charName, igPostMatch[1].trim());
        }
        
        // 2. [IG_REPLY] 답글
        const igReplyMatch = decodedMessage.match(INSTAGRAM_PATTERNS.fixedReply);
        if (igReplyMatch && igReplyMatch[1]) {
            addReplyFromChat(charName, igReplyMatch[1].trim());
        }
        
        // 3. [IG_COMMENT] 댓글 (새 태그)
        const igCommentMatch = decodedMessage.match(INSTAGRAM_PATTERNS.fixedComment);
        if (igCommentMatch && igCommentMatch[1]) {
            addCommentFromChat(charName, igCommentMatch[1].trim());
        }
        
        // 4. 괄호 형식 (하위 호환)
        const parenPostMatch = decodedMessage.match(INSTAGRAM_PATTERNS.parenPost);
        if (parenPostMatch && parenPostMatch[1]) {
            createPostFromChat(charName, parenPostMatch[1].trim());
        }
        
        // 5. 레거시 패턴 (하위 호환)
        const legacyPostMatch = decodedMessage.match(INSTAGRAM_PATTERNS.legacyPost);
        if (legacyPostMatch && legacyPostMatch[1]) {
            createPostFromChat(charName, legacyPostMatch[1].trim());
        }
        
        const legacyReplyMatch = decodedMessage.match(INSTAGRAM_PATTERNS.legacyReply);
        if (legacyReplyMatch && legacyReplyMatch[1]) {
            addReplyFromChat(charName, legacyReplyMatch[1].trim());
        }
        
        // 6. 레거시 댓글 패턴 [Instagram 댓글] "내용"
        const legacyCommentMatch = decodedMessage.match(INSTAGRAM_PATTERNS.legacyComment);
        if (legacyCommentMatch && legacyCommentMatch[1]) {
            addCommentFromChat(charName, legacyCommentMatch[1].trim());
        }
    }
    
    // 최근 답글 (중복 방지용)
    let recentReplies = new Set();
    
    // 채팅 감지로 댓글 추가 (캐릭터가 아무 게시물에나 댓글)
    function addCommentFromChat(charName, commentText) {
        console.log('[Instagram] addCommentFromChat 호출됨:', { charName, commentPreview: commentText?.substring(0, 50) });
        
        // [핵심 중복 방지] 전체 posts에서 같은 작성자 + 같은 텍스트가 있으면 스킵 (영구적!)
        loadPosts();
        const normalizedComment = commentText.trim().toLowerCase();
        const isDuplicateInStorage = posts.some(p => 
            p.comments?.some(c => 
                c.author?.toLowerCase() === charName.toLowerCase() && 
                c.text?.trim().toLowerCase() === normalizedComment
            )
        );
        if (isDuplicateInStorage) {
            console.log('[Instagram] 중복 댓글 감지 (저장된 데이터) - 스킵:', commentText.substring(0, 30));
            return;
        }
        
        // 추가 중복 방지 (race condition 방지)
        const commentKey = `comment:${charName}:${commentText}`;
        if (recentReplies.has(commentKey)) return;
        recentReplies.add(commentKey);
        setTimeout(() => recentReplies.delete(commentKey), 5000);
        
        const user = getUserInfo();
        
        let targetPost = null;
        
        // 1. 먼저 유저가 올린 게시물 중 캐릭터 댓글이 없는 것 찾기 (최신순)
        for (const post of posts) {
            if (post.author === user.name || post.isUser) {
                // 이 게시물에 이미 캐릭터 댓글이 있는지 확인
                const hasCharComment = post.comments.some(c => 
                    c.author.toLowerCase() === charName.toLowerCase()
                );
                
                if (!hasCharComment) {
                    targetPost = post;
                    break;
                }
            }
        }
        
        // 2. 유저 게시물 없으면 캐릭터 본인 게시물에 댓글
        if (!targetPost) {
            for (const post of posts) {
                if (post.author.toLowerCase() === charName.toLowerCase()) {
                    targetPost = post;
                    break;
                }
            }
        }
        
        // 3. 그래도 없으면 아무 게시물에나
        if (!targetPost && posts.length > 0) {
            targetPost = posts[0];
        }
        
        // 대상 게시물 없으면 댓글 안 달음
        if (!targetPost) return;
        
        // [연속 캐릭터 댓글 방지] 마지막 댓글이 유저가 아니면 스킵
        if (targetPost.comments.length > 0) {
            const lastComment = targetPost.comments[targetPost.comments.length - 1];
            if (lastComment.author !== user.name) {
                console.log('[Instagram] 연속 캐릭터 댓글 방지 - 마지막 댓글이 유저가 아님');
                return;
            }
        }
        
        // 댓글 추가
        targetPost.comments.push({
            id: Date.now(),
            author: charName,
            authorAvatar: getContactAvatar(charName),
            text: commentText,
            timestamp: getRpTimestamp()
        });
        
        savePosts();
        
        // 인스타 열려있으면 새로고침
        if ($('.st-insta-app').length) {
            setTimeout(() => open(), 100);
        }
    }
    
    // 채팅 감지로 답글 추가
    function addReplyFromChat(charName, replyText) {
        console.log('[Instagram] addReplyFromChat 호출됨:', { charName, replyPreview: replyText?.substring(0, 50) });
        
        // [핵심 중복 방지] 전체 posts에서 같은 작성자 + 같은 텍스트가 있으면 스킵 (영구적!)
        loadPosts();
        const normalizedReply = replyText.trim().toLowerCase();
        const isDuplicateInStorage = posts.some(p => 
            p.comments?.some(c => 
                c.author?.toLowerCase() === charName.toLowerCase() && 
                c.text?.trim().toLowerCase() === normalizedReply
            )
        );
        if (isDuplicateInStorage) {
            console.log('[Instagram] 중복 답글 감지 (저장된 데이터) - 스킵:', replyText.substring(0, 30));
            return;
        }
        
        // 추가 중복 방지 (race condition 방지)
        const replyKey = `${charName}:${replyText}`;
        if (recentReplies.has(replyKey)) return;
        recentReplies.add(replyKey);
        setTimeout(() => recentReplies.delete(replyKey), 5000);
        
        const user = getUserInfo();
        
        let targetPost = null;
        
        // 1. 먼저 유저가 올린 게시물 중 캐릭터 댓글이 없는 것 찾기
        for (const post of posts) {
            if (post.author === user.name || post.isUser) {
                // 이 게시물에 캐릭터 댓글이 있는지 확인
                const hasCharComment = post.comments.some(c => 
                    c.author.toLowerCase() === charName.toLowerCase()
                );
                
                if (!hasCharComment) {
                    targetPost = post;
                    break;
                }
            }
        }
        
        // 2. 유저 게시물 없으면, 유저가 댓글 단 게시물 중 답글 없는 것 찾기
        if (!targetPost) {
            for (const post of posts) {
                const userComments = post.comments.filter(c => c.author === user.name);
                if (userComments.length === 0) continue;
                
                for (const userComment of userComments) {
                    const hasCharReply = post.comments.some(c => 
                        c.author.toLowerCase() === charName.toLowerCase() && 
                        c.id > userComment.id
                    );
                    
                    if (!hasCharReply) {
                        targetPost = post;
                        break;
                    }
                }
                
                if (targetPost) break;
            }
        }
        
        // 대상 게시물 없으면 댓글 안 달음
        if (!targetPost) return;
        
        // 답글/댓글 추가
        targetPost.comments.push({
            id: Date.now(),
            author: charName,
            authorAvatar: getContactAvatar(charName),
            text: replyText,
            timestamp: getRpTimestamp()
        });
        
        savePosts();
        
        // 인스타 열려있으면 새로고침
        if ($('.st-insta-app').length) {
            setTimeout(() => open(), 100);
        }
    }

    // 최근 생성된 포스트 캡션 (중복 방지용)
    let recentPostCaptions = new Set();
    
    // 채팅 감지로 포스트 생성
    async function createPostFromChat(charName, caption) {
        console.log('[Instagram] createPostFromChat 호출됨:', { charName, captionPreview: caption?.substring(0, 50) });
        
        // [수정] isInstagramInstalled 체크 제거 - 이 함수가 호출됐다는 건 이미 앱이 로드됐다는 뜻
        // 대신 필수 의존성만 체크
        if (!window.STPhone?.Apps?.Store) {
            console.warn('[Instagram] Store 앱 없음 - 포스트 생성 스킵');
            return;
        }
        
        // [IMG:...] 태그 제거 (이미지 프롬프트용 태그)
        caption = caption.replace(/\[IMG:[^\]]*\]/gi, '').trim();
        if (!caption) {
            console.log('[Instagram] 캡션이 비어있음 - 스킵');
            return;
        }
        
        // 이미 생성 중이면 무시
        if (isGeneratingPost) {
            console.log('[Instagram] 이미 생성 중 - 스킵');
            return;
        }
        
        // [핵심 중복 방지] 저장된 포스트에서 같은 작성자 + 같은 캡션이 있으면 스킵 (영구적!)
        loadPosts();
        const isDuplicatePost = posts.some(p => 
            p.author.toLowerCase() === charName.toLowerCase() && 
            p.caption === caption
        );
        if (isDuplicatePost) {
            console.log('[Instagram] 중복 포스트 감지 (저장된 데이터) - 스킵:', caption.substring(0, 30));
            return;
        }
        
        // 추가 중복 방지: 같은 캡션으로 60초 내 재생성 방지 (race condition 방지)
        const captionKey = `${charName}:${caption.substring(0, 50)}`;
        if (recentPostCaptions.has(captionKey)) return;
        recentPostCaptions.add(captionKey);
        setTimeout(() => recentPostCaptions.delete(captionKey), 60000);
        
        isGeneratingPost = true;
        
        try {
            // 이미지 생성 시도 (실패해도 텍스트 전용 포스팅 가능)
            let imageUrl = null;
            let savedImagePrompt = '';
            
            try {
                const photoType = detectPhotoType(caption, caption);
                savedImagePrompt = await generateDetailedPrompt(
                    `${charName} Instagram photo, ${caption}`,
                    charName,
                    photoType,
                    true  // isCharacterPost - 캐릭터가 올리는 포스트
                );
                imageUrl = await generateImage(savedImagePrompt);
            } catch (e) {
                console.warn('[Instagram] 이미지 생성 실패, 텍스트만 포스팅:', e);
                if (window.toastr) {
                    toastr.warning('이미지 생성에 실패했습니다. 텍스트만 포스팅됩니다.', 'Instagram');
                }
            }
            
            // 포스트 저장 (imagePrompt 포함)
            loadPosts();
            const newPost = {
                id: Date.now(),
                author: charName,
                authorAvatar: getContactAvatar(charName),
                imageUrl: imageUrl || '', // 텍스트 전용은 빈 문자열
                caption: caption,
                imagePrompt: savedImagePrompt, // AI가 이미지 내용 인식용
                timestamp: getRpTimestamp(),
                likes: Math.floor(Math.random() * 50) + 10,
                likedByUser: false,
                comments: [],
                isUser: false
            };
            
            posts.unshift(newPost);
            savePosts();
            lastPostTime = Date.now();  // 포스팅 시간 기록 (중복 방지용)
            
            // 토스트 알림
            const postType = imageUrl ? '📸 사진' : '💬 텍스트';
            if (window.toastr) {
                toastr.info(`${postType} ${charName}님이 Instagram에 새 게시물을 올렸습니다`, 'Instagram');
            }
            
            // 인스타 열려있으면 새로고침
            if ($('.st-insta-app').length) {
                setTimeout(() => open(), 100);
            }
            
        } catch (e) {
            console.error('[Instagram] 채팅 감지 포스팅 실패:', e);
        } finally {
            isGeneratingPost = false;
        }
    }

    // 초기화 - messages.js와 동일하게 3초 후 시작
    setTimeout(initProactivePostListener, 3000);

    // 공개 API
    return {
        open,
        generateCharacterPost,
        checkProactivePost,
        createPostFromChat,
        addReplyFromChat,
        addCommentFromChat,
        parseInstagramFromChat,
        loadPosts: () => { loadPosts(); return posts; },
        addComment: addUserComment
    };
})();
