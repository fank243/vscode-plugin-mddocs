// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const {
    window,
    workspace,
    commands
} = require('vscode');

// 引入api
const mddocs = require("./lib/mddocs");
const upload = require("./lib/upload");


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "mddocs" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    // 发布文章
    let publishMd = commands.registerCommand('extension.publishMd', function () {
        // 验证
        if (!validate()) {
            return;
        }

        let docs = new mddocs.MdDocs();
        let data = docs.validateData(false);
        if (data != null) {
            let config = workspace.getConfiguration('mddocs');
            docs.request(config.publishUri, data);
        }
    });
    context.subscriptions.push(publishMd);

    // 编辑文章
    let updateMd = commands.registerCommand('extension.updateMd', function () {
        // 验证
        if (!validate()) {
            return;
        }

        let docs = new mddocs.MdDocs();
        let data = docs.validateData(true);
        if (data != null) {
            let config = workspace.getConfiguration('mddocs');
            docs.request(config.modifyUri, data);
        }
    });
    context.subscriptions.push(updateMd);

    // 删除文章
    let deleteMd = commands.registerCommand('extension.deleteMd', function () {
        // 验证
        if (!validate()) {
            return;
        }

        let docs = new mddocs.MdDocs();
        let data = docs.validateData(true);
        if (data != null) {
            let config = workspace.getConfiguration('mddocs');
            docs.request(config.deleteUri, data);
        }
    });
    context.subscriptions.push(deleteMd);

    // 搜索文章
    let searchMd = commands.registerCommand('extension.searchMd', function () {
        // 验证
        if (!validate()) {
            return;
        }

        window.showInputBox({
            placeHolder: "输入文档标题搜索"
        }).then(function (keyword) {
            if (keyword == undefined || keyword.length <= 0) {
                window.showWarningMessage("输入点什么");
                return;
            }
            let data = {
                "keyword": keyword
            };
            if (data != null) {
                let config = workspace.getConfiguration('mddocs');
                new mddocs.MdDocs().request(config.searchUri, data);
            }
        });
    });
    context.subscriptions.push(searchMd);


    // 上传图片
    let uploadImg = commands.registerCommand('extension.uploadImg', function () {
        // 验证
        if (!validate()) {
            return;
        }

        // @ts-ignore
        window.showOpenDialog({
            canSelectMany: false,
            filters: {
                'Images': ['png', 'jpeg', 'jpg', 'gif', 'bmp']
            }
        }).then(uri => {
            if (uri) {
                new upload.Upload().uploadImage(uri[0].fsPath);
            }
        });

    });
    context.subscriptions.push(uploadImg);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}
exports.deactivate = deactivate;

/**
 * 数据验证
 */
function validate() {
    let config = workspace.getConfiguration('mddocs');
    if(!config.enable){
        window.showWarningMessage("插件未启用");
        return false;
    }
    if (!window.activeTextEditor) {
        window.showWarningMessage("未打开编辑器");
        return false;
    }
    if ("markdown" != window.activeTextEditor.document.languageId) {
        window.showWarningMessage("不支持的文档类型");
        return false;
    }
    return true;
}