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
// 校验上一个脚本是否存在错误
function checkLastScriptHashError(input) {
    if (input.code === 'fail') {
        throw new CommonException(input.data.name, input.data.message);
    }
}

function process(input) {
    try {
        // 获取当前上下文的tenantId
        let tenantId = CORE.CurrentContext.getTenantId();

        BASE.Logger.info("新来源合同创建（带含义字段）-校验脚本,租户ID{} ,输入参数input为{}", tenantId, JSON.stringify(input));

        let { result: { data = {} } } = input;
        BASE.Logger.info("新来源合同创建（带含义字段）-校验脚本,租户ID{} ,输入参数为{}", tenantId, JSON.stringify(data));

        let newErrorArr = [];
        let newSuccessArr = [];

        // 多条数据循环处理
        data.successArr.forEach((item, index, arr) => {
            item.oldId = item.id;
            item.oldObjectVersionNumber = item.objectVersionNumber;
            try {
                // 做必输字段的校验
                checkValid(item);
                checkDataExists(item, tenantId);
                newSuccessArr.push(item);
            } catch (e) {
                item.syncStatus = 'ERROR';
                item.errorCode = e.name;
                item.errorMessage = e.message;
                BASE.Logger.info("新来源合同创建（带含义字段）-校验脚本 出现异常：{}", e.message);
                newErrorArr.push(item);
            }
        });

        BASE.Logger.info("新来源合同创建（带含义字段）-校验脚本-回写错误数据到接口表结果为：{}", JSON.stringify(newErrorArr));

        // 回写校验失败的数据
        if (newErrorArr.length > 0) {
            H0.ModelerHelper.batchUpdateByPrimaryKey('HITF_SOURCE_CONTRACT_HEADER', tenantId, newErrorArr, true);
        }

        // // 此处校验成功后，接口表的数据就算车处理成功，回写状态
        // if (newSuccessArr.length > 0) {
        //     newSuccessArr.forEach((item, index, arr) => {
        //         item.syncStatus = "SUCCESS";
        //     });
        //     H0.ModelerHelper.batchUpdateByPrimaryKey('HITF_SOURCE_CONTRACT_HEADER', tenantId, newSuccessArr, true);
        // }

        BASE.Logger.info("9. 多维度来源合同-校验-校验数据处理完成");
        let response = new CommonResponse(newErrorArr, newSuccessArr);
        return OC.CommonResult.Biz.custom('200', '处理成功', response);
    } catch (e1) {
        BASE.Logger.info("新来源合同创建（带含义字段）-校验脚本存在异常{}", e1.message);
        return OC.CommonResult.Biz.custom('fail', '处理失败', null);
    }
}


/**
 * 校验当前的数据是否已经存在处理成功的数据
 * @param {输入参数} item 
 */
function checkDataExists(item, tenantId) {
    // 查询是否存在处理成功的数据
    let queryParamMap = {
        'sourceSystem': item.sourceSystem,
        'sourceCode': item.sourceCode,
        'tenantId': tenantId,
        '@permissionClose': true
    };

    // 拼接动态sql
    let sql = 'SELECT * FROM hcbm_source_contract_header WHERE tenant_id = #{tenantId} and status_code = "success" ';
    sql = sql + ' and source_system = #{sourceSystem} and source_code = #{sourceCode} ';
    BASE.Logger.info("新来源合同创建（带含义字段）-校验脚本, 查询hcbm_source_contract_header的 sql : {}", sql);

    // 获取查询参数,校验如果相同的来源系统、单据号、行单据号是唯一的，如果存在将跳过处理
    const sourceContract = H0.SqlHelper.selectList('oc-base', sql, queryParamMap);

    BASE.Logger.info("新来源合同创建（带含义字段）-校验脚本-数据库查询结果{},{}", JSON.stringify(sourceContract), typeof sourceContract);
    if (sourceContract && sourceContract.length > 0) {
        throw new CommonException("500002", "[" + item.sourceCode + "]数据已经存在");
    }
}



/**
 * 单条数据校验必输字段
 * @param {输入参数} data 
 */
function checkValid(data) {
    let { type, sourceCode, sourceSystem, originData } = data;
    // 必输字段的校验
    if (type === '' || type === null || type === undefined) {
        throw new CommonException("500001", "必输字段单据类型不能为空")
    }


    if (sourceCode === '' || sourceCode === null || sourceCode === undefined) {
        throw new CommonException("500001", "必输字段单据编码不能为空")
    }

    if (sourceSystem === '' || sourceSystem === null || sourceSystem === undefined) {
        throw new CommonException("500001", "必输字段来源系统不能为空")
    }

    if (originData === '' || originData === null || originData === undefined) {
        throw new CommonException("500001", "必输字段参数内容不能为空")
    }
}