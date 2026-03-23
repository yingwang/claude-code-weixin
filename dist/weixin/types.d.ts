/** iLink Bot API types — based on actual API responses */
export declare const MessageItemType: {
    readonly TEXT: 1;
    readonly IMAGE: 2;
    readonly VOICE: 3;
    readonly FILE: 4;
    readonly VIDEO: 5;
};
export type MessageItemType = (typeof MessageItemType)[keyof typeof MessageItemType];
export interface TextItem {
    text: string;
}
export interface CdnItem {
    file_id?: string;
    file_url?: string;
    aes_key?: string;
    file_size?: number;
    file_name?: string;
    width?: number;
    height?: number;
}
export interface ImageItemMedia {
    encrypt_query_param?: string;
    aes_key?: string;
    encrypt_type?: number;
}
export interface ImageItem {
    media?: ImageItemMedia;
    aeskey?: string;
    file_name?: string;
    mid_size?: number;
}
export interface VoiceItem {
    media?: ImageItemMedia;
    encode_type?: number;
    bits_per_sample?: number;
    sample_rate?: number;
    playtime?: number;
    text?: string;
}
export interface FileItem {
    media?: ImageItemMedia;
    file_name?: string;
    md5?: string;
    len?: string;
}
export interface VideoItem {
    media?: ImageItemMedia;
    video_size?: number;
    play_length?: number;
    video_md5?: string;
    file_name?: string;
}
export interface MessageItemInbound {
    type: number;
    create_time_ms?: number;
    update_time_ms?: number;
    is_completed?: boolean;
    text_item?: TextItem;
    cdn_item?: CdnItem;
    image_item?: ImageItem;
    voice_item?: VoiceItem;
    file_item?: FileItem;
    video_item?: VideoItem;
}
export interface WeixinMessage {
    seq?: number;
    message_id: number;
    from_user_id: string;
    to_user_id: string;
    client_id?: string;
    create_time_ms: number;
    update_time_ms?: number;
    delete_time_ms?: number;
    session_id?: string;
    group_id?: string;
    message_type: number;
    message_state?: number;
    item_list: MessageItemInbound[];
    context_token: string;
}
export interface GetUpdatesResponse {
    ret?: number;
    err_msg?: string;
    msgs: WeixinMessage[];
    sync_buf?: string;
    get_updates_buf?: string;
}
export interface MessageItemOutbound {
    type: MessageItemType;
    text_item?: {
        text: string;
    };
    content?: string;
    cdn?: {
        file_id: string;
        file_url: string;
        aes_key: string;
        file_size: number;
        file_name?: string;
    };
}
export interface SendMessageRequest {
    msg: {
        from_user_id: string;
        to_user_id: string;
        client_id: string;
        message_type: number;
        message_state: number;
        item_list: MessageItemOutbound[];
        context_token?: string;
    };
    base_info?: {
        channel_version: string;
    };
}
export interface SendMessageResponse {
    ret: number;
    err_msg?: string;
    errcode?: number;
    errmsg?: string;
}
export interface QrCodeResponse {
    ret: number;
    err_msg?: string;
    qrcode?: string;
    qrcode_img_content?: string;
}
export interface QrCodeStatusResponse {
    ret: number;
    err_msg?: string;
    status?: string;
    bot_token?: string;
}
export interface GetUploadUrlResponse {
    ret?: number;
    err_msg?: string;
    errcode?: number;
    errmsg?: string;
    upload_param?: string;
    thumb_upload_param?: string;
}
export interface GetConfigResponse {
    ret?: number;
    err_msg?: string;
    errcode?: number;
    errmsg?: string;
    data?: {
        typing_ticket: string;
    };
}
