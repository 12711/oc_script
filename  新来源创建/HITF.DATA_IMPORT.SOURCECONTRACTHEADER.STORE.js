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

function process(input) {
    // input 为传入的 json 数据
    // 获取当前上下文的tenantId
    let tenantId = CORE.CurrentContext.getTenantId();
    let { result:{ data= { } } } = input;
    
    BASE.Logger.info("新来源合同创建（带含义字段）- 存储转换脚本 参数1：{}", JSON.stringify(input));
    BASE.Logger.info("新来源合同创建（带含义字段）- 存储转换脚本 参数：{} {}", JSON.stringify(data),  typeof data);
    BASE.Logger.info("新来源合同创建（带含义字段）- 存储转换脚本 租户 id {}", tenantId);

    let errorArr = [];
    let successArr = [];

    // 保存数据到接口平台的临时表
    BASE.Logger.info("新来源合同创建（带含义字段）- 存储转换脚本 开始处理插入到接口表 ‘HITF_SOURCE_CONTRACT_HEADER’");
    let res = H0.ModelerHelper.batchInsert('HITF_SOURCE_CONTRACT_HEADER', tenantId, data, true);
    BASE.Logger.info("新来源合同创建（带含义字段）- 存储转换脚本 处理完成插入到接口表 ‘HITF_SOURCE_CONTRACT_HEADER’ -- {}", res);
    successArr = successArr.concat(res);
    let response = new CommonResponse(errorArr, successArr);
    return OC.CommonResult.Biz.custom('200','ok',response);
}