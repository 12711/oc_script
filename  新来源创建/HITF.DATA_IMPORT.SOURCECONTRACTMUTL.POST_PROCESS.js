function process(input){
    // input 为传入的 json 数据
    // 从这里开始编写代码，代码可使用 javascript 编写，支持 ES6 语法，可通过右侧面板快速插入通用方法及参考字段
    // 可在外部定义其他方法，在该方法中进行调用，但主方法（process）只能有一个
    BASE.Logger.info("新来源合同创建（带含义字段）-后置处理脚本,输入参数为{}", JSON.stringify(input));
    return input.result;
  }