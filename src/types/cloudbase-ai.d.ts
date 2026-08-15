// @cloudbase/js-sdk 的类型声明引用了未声明的依赖 @cloudbase/ai，npm 解析会向上层
// 目录查找，命中宿主机器上语法过新的全局副本时 vue-tsc 直接解析失败。
// 本项目未使用 js-sdk 的 AI 命名空间，此文件配合 tsconfig paths 固定其形状，
// 让类型解析始终落在项目内，不随宿主环境变化。
export type AI = unknown
