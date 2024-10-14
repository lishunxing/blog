# 发布Vue项目到本机Nginx

## 安装NodeJs
Vue3建议NodeJs版本是20以上的版本, 最低要求18, 下载nodeJs 20.14
> centos7版本gcc和make还有glibc版本都很低 无法运行Nodejs18 这里要下载带glibc版本的nodejs
非官方版本地址: https://unofficial-builds.nodejs.org/download/release/

```shell
# 创建文件夹
mkdir -p /usr/local/nodejs && cd /usr/local/nodejs

# 下载
wget https://unofficial-builds.nodejs.org/download/release/v20.14.0/node-v20.14.0-linux-x64-glibc-217.tar.gz

# 解压
tar -zxvf node-v20.14.0-linux-x64-glibc-217.tar.gz

# 添加到环境变量
vim /etc/profile
export NODE_HOME=/usr/local/nodejs/node-v20.14.0-linux-x64-glibc-217
export PATH=$PATH:${NODE_HOME}/bin

# 刷新环境变量
source /etc/profile

```
*设置npm源为阿里源*
```shell
npm config set registry=https://registry.npmmirror.com
```
## 创建Jenkins流水线
- 新建Item 输入blog
![新建item](https://file.lishunxing.cn/img/%E6%96%B0%E5%BB%BAItem.png)
- 配置源码地址
![配置源码地址](https://file.lishunxing.cn/img/%E9%85%8D%E7%BD%AE%E6%BA%90%E7%A0%81%E5%9C%B0%E5%9D%80%E9%80%89%E6%8B%A9jdk.png)
- 选择git分支
![选择git分支](https://file.lishunxing.cn/img/%E9%80%89%E6%8B%A9git%E5%88%86%E6%94%AF.png)
- 构建环境选择NodeJS
![构建环境选择NodeJS](https://file.lishunxing.cn/img/构架环境选择nodejs.png)
- 添加构建步骤
```shell
node -v
ls
npm install
npm run docs:build
rm -rf /opt/static/dist
cp -a .vitepress/dist /opt/static # copy编译好的文件到nginx配置的目录中
```
![添加构建步骤](https://file.lishunxing.cn/img/添加构建步骤.png)