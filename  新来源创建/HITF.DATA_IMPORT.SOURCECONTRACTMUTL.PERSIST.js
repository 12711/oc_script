// 声明一个公共的数据结构
class CommonResponse {
    constructor(errorArr, successArr) {
        this.errorArr = errorArr;
        this.successArr = successArr;
    }
}

// 声明一个通用的报错信息异常
function CommonException(name, message) {
    this.message = message;
    this.name = name;
}
// 批量更新数据
function batchUpdateByPrimaryKey(waitHandlerDatas, modelCode, tenantId) {
    try {
        H0.ModelerHelper.batchUpdateByPrimaryKey(modelCode, tenantId, waitHandlerDatas, true);
    } catch (e) {
        BASE.Logger.info("新来源合同创建（带含义字段）-写入脚本存在异常0000000 {}{}", e instanceof Error, JSON.stringify(e));
        throw new CommonException("20008", '保存到中间表失败');
    }
}

function process(input) {
    // 获取当前上下文的tenantId
    let tenantId = CORE.CurrentContext.getTenantId();
    let { result: { data = {} } } = input;
    BASE.Logger.info("新来源合同创建（带含义字段）-写入脚本,租户ID{} ,输入参数为{}", tenantId, JSON.stringify(data));

    if (input.result.errcode === 'fail') {
        return OC.CommonResult.Interface.custom('500', '系统异常', null);
    }

    try {
        // 获取之前脚本处理的失败的数据和成功数据
        let { errorArr, successArr } = data;

        // 检索接口表的ID生成新的数据作为base接口的入参
        let paramData = successArr.map(obj => { return obj.oldId })
        BASE.Logger.info("新来源合同创建（带含义字段）-写入脚本, 调用base接口的输入参数为{}", JSON.stringify(paramData));

        // 通过接口的ID将接口的表originData,存储到各个临时表
        const serverId = "oc-base";
        const path = "/v1/" + tenantId + "/sourceContract/hcbm/mutil/batchInsert";
        let res = BASE.FeignClient.selectClient(serverId).doPost(path, JSON.stringify(paramData));
        BASE.Logger.info("新来源合同创建（带含义字段）-写入脚本-数据保存到正式表结果：{}", res);


        let newErrorArr = [];
        newErrorArr = newErrorArr.concat(errorArr);
        let newSuccessArr = [];

        // 如果整个都处理失败，那么这一批数据都设置为车处理失败，并且记录原因
        res = JSON.parse(res);
        if (res.failed) {
            successArr.forEach((item, index, arr) => {
                item.id = item.oldId;
                item.objectVersionNumber = item.oldObjectVersionNumber;
                item.syncStatus = 'ERROR';
                item.errorCode = "persisted.error";
                item.errorMessage = "存储到中间表失败";
            });

            BASE.Logger.info("新来源合同创建（带含义字段）-写入脚本-数据保存到正式表错误：{}", successArr);
            batchUpdateByPrimaryKey(successArr, 'HITF_SOURCE_CONTRACT_HEADER', tenantId);
            newErrorArr = newErrorArr.concat(successArr);
        } else {
            successArr.forEach((item, index, arr) => {
                item.id = item.oldId;
                item.objectVersionNumber = item.oldObjectVersionNumber;
                item.syncStatus = 'PERSISTED';
            });

            BASE.Logger.info("新来源合同创建（带含义字段）-写入脚本-数据保存到正式表成功：{} {}", res, successArr);
            batchUpdateByPrimaryKey(successArr, 'HITF_SOURCE_CONTRACT_HEADER', tenantId);
            newSuccessArr = newSuccessArr.concat(res);
        }

        if (newSuccessArr.length > 0) {
            BASE.Logger.info("新来源合同创建（带含义字段）-写入脚本-数据保存到正式表成功即将处理自动创建：{}", res);
            let willAutoCreateArr = [];

            // 获取需要自动创建的数据
            newSuccessArr.forEach((item, index, arr) => {
                if (item.autoCreateFlag) {
                    willAutoCreateArr.push(item);
                }
            });
            // 基于需要自动创建的数据进行接口调用：处理自动创建合同
            let asyncAutoCreateParam = willAutoCreateArr.map(obj => { return obj.id });
            const afterServerId = "oc-base";
            const afterPath = "/v1/" + CORE.CurrentContext.getTenantId() + "/sourceContract/mutil/auto/create-async";
            // 将处理成功的数据进行自动创建逻辑
            let afterRes = BASE.FeignClient.selectClient(afterServerId).doPost(afterPath, JSON.stringify(asyncAutoCreateParam));
            BASE.Logger.info("新来源合同创建（带含义字段）-写入脚本  res {}", afterRes);
            afterRes = JSON.parse(afterRes);
            BASE.Logger.info("新来源合同创建（带含义字段）-写入脚本： {}", !afterRes.failed);
            if (afterRes.failed) {
                newErrorArr = newErrorArr.concat(newSuccessArr);
                newSuccessArr = [];
            }
        }

        // 错误数据只需要展示部分字段即可 sourceSystem,sourceCode,errorCode,errorMessage
        let finalErrorArr = [];
        if (newErrorArr.length > 0) {
            newErrorArr.forEach((item, index, arr) => {
                let errorData = {};
                errorData.sourceSystem = item.sourceSystem;
                errorData.sourceCode = item.sourceCode;
                errorData.errorMessage = item.errorMessage;
                errorData.errorCode = item.errorCode;
                finalErrorArr.push(errorData);
            });
            newErrorArr = finalErrorArr;
        }
        let response = new CommonResponse(newErrorArr, newSuccessArr);

        BASE.Logger.info("新来源合同创建（带含义字段）-写入脚本:{}", JSON.stringify(response));

        if (newErrorArr.length > 0 && newSuccessArr.length == 0) {
            return OC.CommonResult.Biz.custom('20010', '所有数据处理失败', response);
        } else if (newErrorArr.length > 0 && newSuccessArr.length > 0) {
            return OC.CommonResult.Biz.custom('20009', '部分数据处理成功', response);
        } else {
            return OC.CommonResult.Biz.custom('00000', '所有数据处理成功', response);
        }
    } catch (e1) {
        BASE.Logger.info("新来源合同创建（带含义字段）-写入脚本存在异常 {}", e1);
        BASE.Logger.info("新来源合同创建（带含义字段）-写入脚本存在异常栈 {}", e1.stack);
        if (e1 instanceof CommonException) {
            return OC.CommonResult.Biz.custom(e1.name, e1.message, null);
        } else {
            return OC.CommonResult.Biz.custom('500', '系统异常', null);
        }
    }
}