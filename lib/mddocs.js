//  vscode
const {
    window,
    workspace,
    Uri,
    WorkspaceEdit,
    Range,
    Position
} = require("vscode");

// HTTP 请求插件
const request = require("request");

//  获取MD元数据插件
const fm = require("front-matter");

const util = require("util");
const path = require("path");
const METADATA_HEADER = `\
---
sign: %s
title: %s
channel: %s
tags: %s
---

`;
const METADATA_HEADER2 = `\
---
sign: %s
title: %s
channel: %s
path: %s
tags: %s
---

`;

// 图片
const IMG = `![%s](%s %s)`

/**
 * Api 接口
 */
class MdDocs {

    constructor() {
        this.validateConfig();
    }

    // 配置验证
    validateConfig() {
        // 配置属性
        let config = workspace.getConfiguration('mddocs');

        if (!config.enable) {
            window.showWarningMessage("MdDocs 已禁用");
            return false;
        }

        if (config.accessToken == null || config.accessToken == "") {
            window.showWarningMessage("授权访问凭证未配置");
            return false;
        }
        return true;
    }

    // 数据验证
    validateData(flag) {
        let config = workspace.getConfiguration('mddocs');

        // 获取内容
        let text = window.activeTextEditor.document.getText();

        // 解析元数据
        let result = fm(text);

        let sign = result.attributes.sign;
        let title = result.attributes.title;
        let channel = result.attributes.channel;
        let path = result.attributes.path;
        let tags = result.attributes.tags;

        let content = result.body;

        if (flag && (sign == null || sign == "")) {
            window.showWarningMessage("元数据[签名]丢失，请重新获取数据");
            return null;
        }
        if (title == null || title == "") {
            window.showWarningMessage("请填写元数据[标题]");
            return null;
        }
        if (channel == null || channel == "") {
            window.showWarningMessage("请填写元数据[频道]");
            return null;
        }
        if (content == null || content == "") {
            window.showWarningMessage("请填写文档内容");
            return null;
        }

        var data;
        if (config.path) {
            data = {
                "sign": sign,
                "title": title,
                "channel": channel,
                "path": path,
                "tags": tags,
                "content": content
            };
        } else {
            data = {
                "sign": sign,
                "title": title,
                "channel": channel,
                "tags": tags,
                "content": content
            };
        }

        return data;
    }

    // 发布 Markdown
    publishMd(body) {
        let text = window.activeTextEditor.document.lineAt(1).text;
        window.activeTextEditor.edit(editBuilder => {
            if (text.startsWith("sign")) {
                editBuilder.replace(new Range(new Position(1, 0), new Position(1, text.length)), "sign: " + body.payload);
            } else {
                editBuilder.insert(new Position(1, 0), "sign: " + body.payload + "\n");
            }
        });
        window.showInformationMessage(body.msg);
    }

    // 更新 Markdown 
    updateMd(body) {
        window.showInformationMessage(body.msg);
    }

    // 删除 Markdown
    deleteMd(body) {
        window.showInformationMessage(body.msg);
    }

    // 搜索 Markdown
    searchMd(body) {
        let config = workspace.getConfiguration("mddocs");
        let result = body.payload;
        if (result == undefined || result == null || result == "") {
            window.showWarningMessage("未搜索到相关文章");
            return;
        }
        let array = [];
        for (var i = 0; i < result.length; i++) {
            array[i] = result[i].title;
        }

        window.showQuickPick(array).then(function (title) {
            let json = findByTitle(result, title);
            let imgPath = 'No';
            if (config.path) {
                imgPath = json['path'];
            }

            let content = genMetaHeader(json['sign'], title, json['channel'], imgPath, json['tags']) + json['content'];

            let filePath = workspace.rootPath;
            if (filePath == undefined || filePath == null) {
                let files = workspace.textDocuments;
                if (files.length) {
                    filePath = path.dirname(files[files.length - 1].fileName);
                } else {
                    window.setStatusBarMessage("Error：获取工作空间目录失败");
                    workspace.openTextDocument("untitled-1.md").then(document => {
                        window.showTextDocument(document);
                    });
                }
            }

            // 新建文档
            let newFile = Uri.parse("untitled:" + path.join(filePath, title + ".md"));
            workspace.openTextDocument(newFile).then(document => {
                const edit = new WorkspaceEdit();
                edit.insert(newFile, new Position(0, 0), content);

                return workspace.applyEdit(edit).then(success => {
                    if (success) {
                        window.showTextDocument(document);
                    } else {
                        window.showErrorMessage("Error...");
                    }
                });
            });
        });
    }

    // 上传图片
    uploadImg(body) {
        let editor = window.activeTextEditor;
        editor.edit(editBuilder => {
            let img = genImage(body.title, body.url);
            editBuilder.insert(editor.selection.active, img);
        });
    }

    //   发送请求
    request(uri, data) {
        let config = workspace.getConfiguration('mddocs');

        let apiUrl = config.apiUrl
        request.post({
            url: apiUrl + uri,
            json: true,
            headers: {
                "accessToken": config.accessToken
            },
            form: data
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                if (!body.success) {
                    window.showWarningMessage(body.msg);
                    return;
                }

                let str = uri + "";
                let type = str.substring(str.lastIndexOf("/") + 1, str.length);
                switch (type) {
                    case "publish":
                        new MdDocs().publishMd(body);
                        break;

                    case "modify":
                        new MdDocs().updateMd(body);
                        break;

                    case "delete":
                        new MdDocs().deleteMd(body);
                        break;

                    case "search":
                        new MdDocs().searchMd(body);
                        break;

                    case "uploadImage":
                        new MdDocs().uploadImg(body);
                        break;

                    default:
                }
            } else {
                window.showWarningMessage("请求失败");
            }
        });
    }
}
exports.MdDocs = MdDocs;


/**
 * 根据标题查找
 * @param {array} array  数据集
 * @param {string} title  标题
 * @return {JSON} markdown 数据对象
 */
function findByTitle(array, title) {
    for (var i = 0; i < array.length; i++) {
        if (array[i].title == title) {
            return array[i];
        }
    }
    return null;
}


/**
 * 生成markdown 头部元数据
 * @param {string} sign 签名
 * @param {string} title 标题
 * @param {string} channel 频道
 * @param {string} path 图片相对路径
 * @param {string[]} tags  标签
 */
function genMetaHeader(sign, title, channel, path, tags) {
    if (path == 'No') {
        return util.format(METADATA_HEADER, sign, title, channel, tags);
    }
    return util.format(METADATA_HEADER2, sign, title, channel, path, tags);
}


/**
 * 生成markdown Image
 * @param {string} title img标签title属性
 * @param {string} url 图片URL地址
 */
function genImage(title, url) {
    return util.format(IMG, title, url, title);
}