---
类型: 知识笔记
领域: ROS2
状态: 学习中
创建时间: 2026-11-14 16:19
修改时间: 2026-11-15 11:50:26
tags:
  - ROS2
title: 桥接器 uXRCE-DDS中间件
date: 2026-11-14
updated: 2026-11-15
publish: true
domain: ROS2
featured: true
excerpt: PX4 使用 uXRCE-DDS 中间件，允许 uORB 消息像 ROS 2 主题一样在配套计算机上发布和订阅。这为 PX4 与 ROS 2 之间提供了快速且可靠的集成，使 ROS 2 应用获取车辆信息和发送命令变得更加便捷。
web_slug: micro-xrce-dds-bridge
web_id: micro-xrce-dds-bridge
rendered_body: rendered-notes/micro-xrce-dds-bridge.html
rendered_source_hash: da766e860699eb29b2887ac36b24980b77ece0e43f2a627a177c259fcae192da
source_vault_path: 02-知识笔记/2. 无人机 PX4-ROS2/2. 桥接器 uXRCE-DDS中间件.md
mathjax: true
render_with_liquid: false
---
## uXRCE-DDS是什么

PX4 使用 `uXRCE-DDS` 中间件，允许 `uORB` 消息像 `ROS 2` 主题一样在配套计算机上发布和订阅。这为 PX4 与 ROS 2 之间提供了快速且可靠的集成，使 ROS 2 应用获取车辆信息和发送命令变得更加便捷。

PX4 采用 `XRCE-DDS` 实现，利用 `eProsima Micro XRCE-DDS`。

代理端(Agent)充当客户端的代理，使其能够在DDS全局数据空间中发布和订阅话题。

![Architecture uXRCE-DDS with ROS 2|700](https://docs.px4.io/v1.17/assets/architecture_xrce-dds_ros2.CpY9H3P9.svg)

`uXRCE-DDS 中间件`由运行在 `PX4` 上的客户端和运行在伴随计算机上的代理组成，两者之间通过串口或 `UDP` 链路实现双向数据交换。代理作为客户端的代理，使其能够发布和订阅全球 DDS 数据空间中的主题。

*相关笔记*：[[3. UDP与TCP协议]]

## 代码构建

`PX4 uxrce_dds_client` 在构建时生成，默认包含在 `PX4` 中。*代理不依赖客户端代码。它可以独立构建，也可以在 ROS 2 工作区中构建*，或者作为 `Ubuntu` 上的 `snap` 包安装。

在 Ubuntu 系统中，你可以从源代码构建该软件，并使用以下命令单独安装该代理程序：

```sh
git clone -b v2.4.3 https://github.com/eProsima/Micro-XRCE-DDS-Agent.git
cd Micro-XRCE-DDS-Agent
mkdir build
cd build
cmake ..
make
sudo make install
sudo ldconfig /usr/local/lib/
```

## 启动代理

该代理用于通过特定通道与客户端进行连接，例如 `UDP` 或串行连接。这些通道设置可以在启动代理时通过命令行选项进行指定。相关说明可以在 `eProsima` *用户指南《Micro XRCE-DDS 代理》>“代理 CLI”部分找到*。请注意，该代理支持多种通道选项，但 `PX4` 仅支持 `UDP` 和串行连接。

例如，`PX4` 模拟器通过 `UDP` 协议在端口 `8888` 运行 `uXRCE-DDS` 客户端。因此，要连接到模拟器，可以使用以下命令启动代理程序：

```sh
MicroXRCEAgent udp4 -p 8888
```

在处理实际硬件时，设置会根据硬件、操作系统和通信通道而有所不同。例如，如果你使用的是 RPi `UART0` 串行端口，那么连接方式可以参考([Raspberry Pi Documentation > Configuring UARTS](https://www.raspberrypi.com/documentation/computers/configuration.html#configuring-uarts)中关于配置 UARTS 的部分说明。

```sh
sudo MicroXRCEAgent serial --dev /dev/AMA0 -b 921600
```

## ## 支持的 uORB 消息

通过客户端可以访问的 `PX4 uORB` 主题集合定义在 `dds_topics.yaml` 文件中。

请注意，`ROS 2/DDS` 需要使用与在 `PX4` 固件中创建 `uXRCE-DDS` 客户端模块时相同的消息定义，这样才能正确解析这些消息。这些消息定义存储于 `ROS 2` 接口包 `PX4/px4_msgs` 中，并且会通过 CI 在 `main` 和 release 分支上进行自动同步。此外，`PX4` 源代码中的所有消息都存在于该代码仓库中，但只有 `dds_topics.yaml` 文件中列出的消息才会作为 `ROS 2` 话题使用。因此，请确保使用正确的消息进行通信。

- 如果您正在使用 PX4 的主要版本或发布版本，您可以通过克隆接口包[PX4/px4_msgs](https://github.com/PX4/px4_msgs)获得消息定义。
- 查看可用话题。

```sh
ros2 topic list -t 
```

## 参考资料

[入门指南 | PX4 Guide (v1.17)](https://docs.px4.io/v1.17/zh/middleware/uxrce_dds)