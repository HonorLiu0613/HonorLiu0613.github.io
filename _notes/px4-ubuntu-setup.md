---
类型: 知识笔记
领域: ROS2
状态: 学习中
创建时间: 2026-11-14 15:51
修改时间: 2026-11-14 21:15:20
tags:
  - 领域
  - ROS2
title: 环境搭建 PX4 v1.17.0  Ubuntu22.04
date: 2026-11-14
updated: 2026-11-15
publish: true
domain: ROS2
featured: false
excerpt: PX4 是一款专业级飞控。 它由来自业界和学术界的世界级开发商开发，并得到活跃的全球社区的支持，为从竞速和物流无人机到地面车辆和潜水艇的各种载具提供动力。
web_slug: px4-ubuntu-setup
web_id: px4-ubuntu-setup
rendered_body: rendered-notes/px4-ubuntu-setup.html
rendered_source_hash: c6bfe64847c7e6824c50f521d9bbde20d35e28ee88d458e0daacb5e0603a9948
source_vault_path: 02-知识笔记/2. 无人机 PX4-ROS2/1. 环境搭建 PX4 v1.17.0  Ubuntu22.04.md
mathjax: true
render_with_liquid: false
---

## 一句话理解

## 什么是PX4

_PX4_ 是一款专业级飞控。 它由来自业界和学术界的世界级开发商开发，并得到活跃的全球社区的支持，为从竞速和物流无人机到地面车辆和潜水艇的各种载具提供动力。

## 架构介绍

![PX4 architecture - FC only system|633](https://docs.px4.io/v1.17/assets/px4_arch_fc.C3B09NE9.svg)

- PX4架构使用`UORB总线`进行内部的通信。
- 使用`MAVLink`与`QGC`地面站进行通信。
- 使用`uXRCE-DDS`通过桥接内部的话题与ROS2通信。

- *相关笔记：*  [[2. 桥接器 uXRCE-DDS中间件]]
## 控制架构
![[Pasted image 20261114161356.png]]

这些估计数据来源于 EKF2。

## 1.克隆PX4源码

```sh
git clone https://github.com/PX4/PX4-Autopilot.git --recursive
```
`
**INFO**
源代码中的环境配置脚本通常适用于最新的 PX4 版本。如果你使用的是较旧版本的 PX4，那么可能需要获取针对特定版本的源代码。


在 bash shell 中，无需提供任何参数即可运行 ubuntu.sh 脚本，以完成所有安装操作：

```bash
bash ./PX4-Autopilot/Tools/setup/ubuntu.sh
```

- 在安装过程中确认并通过所有的提示。
- You can use the `--no-nuttx` and `--no-sim-tools` options to omit the NuttX and/or simulation tools.  
    你可以使用 `--no-nuttx` 和 `--no-sim-tools` 选项来跳过 NuttX 和/或仿真工具的使用。


## 2.下载 QGroundControl

官方推荐使用 **AppImage**：

- GitHub Releases：  
    [https://github.com/mavlink/qgroundcontrol/releases](https://github.com/mavlink/qgroundcontrol/releases)
- 下载文件名通常为：  
    **QGroundControl-x86_64.AppImage** 或 **QGroundControl.AppImage**
    **请选择与你版本适配的版本**

## 3.构建代码

- 请注意`PX4-Gazebo`环境要求必须开着`QGC`才可以运行
```bash
make px4_sitl gz_x500
```

## 相关知识

- [PX4中文手册](https://docs.px4.io/v1.17/zh)




