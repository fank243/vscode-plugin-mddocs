const vscode = require("vscode");

const request = require("request");
const fs = require("fs");
const util = require("util");
//  获取MD元数据插件
const fm = require("front-matter");
const IMG = "![%s](%s \"%s\")";

class Upload {
    /**
     *  上传图片
     * @param {string} localPath  图片本地路径
     */
    uploadImage(localPath) {
        let config = vscode.workspace.getConfiguration('mddocs');

        let apiUrl = config.apiUrl;
        if (apiUrl == null || apiUrl == "") {
            apiUrl = apiUrl.default;
        }

        // 获取内容
        let text = vscode.window.activeTextEditor.document.getText();

        // 解析元数据
        let result = fm(text);
        // 获取图片相对路径
        let path = result.attributes.path;
        if(path == undefined || path ==null || path == ""){
            path = "";
        }

        request.post({
            url: apiUrl + config.uploadImageUri,
            headers: {
                "accessToken": config.accessToken
            },
            formData: {
                "path":path,
                "img": fs.createReadStream(localPath)
            }
        }, (error, response, body) => {
            if (!error && response.statusCode == 200) {
                let data = eval('(' + body + ')');
                if (!data.success) {
                    vscode.window.showWarningMessage(data.msg);
                    return;
                }
                var result = data.payload;
                let img = formatImg(result.title, result.url);

                let editor = vscode.window.activeTextEditor;
                editor.edit(editBuilder => {
                    editBuilder.insert(editor.selection.active, img);
                });
            }
        });
    }
}
exports.Upload = Upload;


/**
 * 生成图片地址
 * @param {string} title 标题
 * @param {string[]} url  Url地址
 */
function formatImg(title, url) {
    return util.format(IMG, title, url, title);
}