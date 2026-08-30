---
title: "Derivation-to-kalman-filter"
excerpt: "This is a Derivation to kalman filter."
header:
  teaser: "2026-08-29-Derivation-to-kalman-filter/web.png"
collection: portfolio
mathjax: true
date: 2026-08-29
---

# Derivation to kalman filter 引言叠甲
本人也是控制小白，本文推导参考Dr.CAN的推导过程，仅作为个人学习比较，如有错误，敬请指正。

# 1.问题引入
我们很正常的考虑一个问题，假设一个状态是一个比较稳定的值，那我们可以通过采样它得到一系列的值，然后取平均，作为估计值。如下：

$$
\hat x_{k}=\frac{1}{k}\sum_{i=1}^{k}x_{i} \tag{1}
$$

对这个公式进行改写得到：

$$
\hat x_{k}=\frac{1}{k}\sum_{i=1}^{k-1}x_{i}+\frac{1}{k}x_{k-1} \tag{2}
$$

提出一个${k-1}$项，得到：

$$
\hat x_{k}=\frac{1}{k}\frac{(k-1)}{(k-1)}\sum_{i=1}^{k-1}x_{i}+\frac{1}{k}x_{k-1} \tag{3}
$$

可以看出求的是${k-1}$项的平均值，所以可以写成：

$$
\hat x_{k}=\frac{k-1}{k}\hat x_{k-1}+\frac{1}{k}x_{k-1} \tag{4}
$$

展开：

$$
\hat x_{k}=\hat x_{k-1}+\frac{1}{k}x_{k-1}-\frac{1}{k}\hat x_{k-1} \tag{5}
$$

合并：

$$
\hat x_{k}=\hat x_{k-1}+\frac{1}{k}(x_{k-1}-\hat x_{k-1}) \tag{6}
$$

我们可以看到，这个公式就是卡尔曼滤波器的一个简化版本，它只考虑了上一时刻的估计值和当前时刻的测量值，而没有考虑噪声。k时刻的估计值可以由k-1时刻的估计值和k时刻的测量值得到，这个公式就是卡尔曼滤波器的基本公式。

# 2.对于线性系统的分析与公式推导
假设我们有一个线性系统，其状态转移方程为：

$$
x_{k}=Ax_{k-1}+Bu_{k-1}+w_{k-1} \tag{1}
$$

其中，$x_{k}$是k时刻的状态，$A$是状态转移矩阵，$u_{k-1}$是k-1时刻的控制输入，$w_{k-1}$是k-1时刻的过程噪声，不可测量，但服从正态分布 $w_{k} \sim \mathcal{N}\big( 0, Q\big)$。其中$Q$是其协方差矩阵。


假设我们有一个测量方程，其测量值为：

$$
z_{k}=Hx_{k}+v_{k} \tag{2}
$$

其中，$z_{k}$是k时刻的测量值，$H$是测量矩阵，$v_{k}$是k时刻的测量噪声，不可测量，但服从正态分布$v_{k} \sim \mathcal{N}\big( 0, R\big)$。其中$R$是其协方差矩阵。

由于$w_{k-1}$和$v_{k}$是不可测量的，我们在实际使用的时候方程如下：

$$
\hat x_{k}^{-}=A\hat x_{k-1}+Bu_{k-1} \tag{3}
$$

$$
z_{k}=Hx_{k} \tag{4}
$$

其中，$\hat x_{k}^{-}$ 是k时刻的先验状态估计值，因为其没进行任何的处理，$z_{k}$是k时刻的测量值估计值。
由公式4，我们可以得到：

$$
x_{k}=H^{-1}z_{k} \tag{5}
$$

由第一章数据融合的分析我们可以得到：

$$
\hat x_{k}=\hat x_{k}^{-}+\frac{1}{k}(x_{k}-\hat x_{k}^{-}) \tag{6}
$$

$\hat x_{k}$是后验估计，$\hat x_{k}^{-}$是先验估计，$x_{k}$实际值，$G$的范围是0到1，带入公式5，则公式6可以写成：

$$
\hat x_{k}=\hat x_{k}^{-}+G(H^{-1}z_{k}-\hat x_{k}^{-}) \tag{7}
$$

令$G = K_{k}H$得：

$$
\hat x_{k}=\hat x_{k}^{-}+K_{k}H(H^{-1}z_{k}-\hat x_{k}^{-}) \tag{8}
$$

$$
=\hat x_{k}^{-}+K_{k}(z_{k}-H\hat x_{k}^{-}) \tag{8}
$$

其中$K_{k}\in\left[ 0, H^{-1}\right]$
当$K_{k}= H^{-1}$ 时, 
$\hat x_{k}=H^{-1}z_{k}=x_{k}$ 
说明更相信测量值。
当$K_{k}=0$时，$\hat x_{k} = \hat x_{k}^{-}$ 
说明更相信估计值。
因此我们的目标是找到一个$K_{k}$,使得 $\hat x_{k}$更接近$x_{k}$ 。
引入误差方程：

$$
e_{k}=x_{k}-\hat x_{k} \tag{9}
$$

前者为实际值，后者为估计值。
代入公式8得：

$$
e_{k}=\hat x_{k}^{-}+K_{k}(z_{k}-H\hat x_{k}^{-})-x_{k} \tag{10}
$$

中$e_{k}$满足$e_{k} \sim \mathcal{N}\big( 0, P_{k}\big)$。其中$P_{k}$是其协方差矩阵。

我们希望误差最小，即$e_{k} = 0$，因为其期望为0，因此$e_{k}$的方差尽可能的小，也就是协方差矩阵$P_{k}$的对角线：迹$trace(P_{k})$尽可能小，（协方差矩阵对角线表示方差）。所以问题变成如何找到一个$K_{k}$使得$trace$最小。

协方差的定义:

$$
\boldsymbol P = \mathrm{Cov}(\boldsymbol e)
=\mathbb{E}\Big[\,\big(\boldsymbol e-\boldsymbol \mu_{\boldsymbol e}\big)\,\big(\boldsymbol e-\boldsymbol \mu_{\boldsymbol e}\big)^\top\,\Big] \tag{11}
$$

其中$\boldsymbol \mu_{\boldsymbol e}$是误差的均值，由于期望为0，所以$\boldsymbol \mu_{\boldsymbol e} = 0$，所以公式11可以简化为：

$$
\boldsymbol P = \mathbb{E}\Big[\,\boldsymbol e\,\boldsymbol e^\top\,\Big] \tag{12}
$$

本文中所有涉及的协方差计算都为此公式。
代入公式9：

$$
\boldsymbol P = \mathbb{E}\Big[\,\big(x_{k}-\hat x_{k}\big)\,\big(x_{k}-\hat x_{k}\big)^\top\,\Big] \tag{13}
$$

先整理$x_{k} - \hat x_{k}$:
代入公式8：

$$
x_{k}-\hat x_{k} = x_{k} - \hat x_{k}^{-} - K_{k}(z_{k}-H\hat x_{k}^{-}) \tag{14}
$$

展开整理：

$$
x_{k}-\hat x_{k} = x_{k} - \hat x_{k}^{-} - K_{k}z_{k} + K_{k}H\hat x_{k}^{-} \tag{15}
$$

把$z_{k}$用公式2表示：

$$
= x_{k} - \hat x_{k}^{-} - K_{k}Hx_{k} + K_{k}H\hat x_{k}^{-} - K_{k}v_{k} \tag{16}
$$

提出$x_{k} - \hat x_{k}^{-}$:

$$
= (x_{k} - \hat x_{k}^{-}) - K_{k}H(x_{k} - \hat x_{k}^{-}) - K_{k}v_{k} \tag{17}
$$

整理：

$$
= (I - K_{k}H)(x_{k} - \hat x_{k}^{-}) - K_{k}v_{k} \tag{18}
$$

定义 $e_{k}^{-} = x_{k} - \hat x_{k}^{-}$，$e_{k}^{-}$ 为先验误差：
代入公式12，求$P_{k}$:

$$
\boldsymbol P_{k} = \mathbb{E}\Big[\,\big((I - K_{k}H)e_{k}^{-} - K_{k}v_{k}\big)\,\big((I - K_{k}H)e_{k}^{-} - K_{k}v_{k}\big)^\top\,\Big] \tag{19}
$$

由转置的性质展开：

$$
=\mathbb{E}[(( I- K_{k} H) e_{k}^{-}- K_{k} v_{k})
({e_{k}^{-}}^\top( I- K_{k} H)^\top-{v_{k}}^\top K_{k}^\top)]
$$

整理得：

$$
=\mathbb{E}[( I- K_{k} H) e_{k}^{-}{e_{k}^{-}}^\top( I- K_{k} H)^\top +  K_{k} v_{k}{v_{k}}^\top K_{k}^\top - ( I- K_{k} H) e_{k}^{-}{v_{k}}^\top K_{k}^\top -  K_{k} v_{k}{e_{k}^{-}}^\top( I- K_{k} H)^\top] \tag{20}
$$

先看后两项：
对其求均值：

$$
\mathbb{E}[(I- K_{k} H) e_{k}^{-}{v_{k}}^\top K_{k}^\top -  K_{k} v_{k}{e_{k}^{-}}^\top( I- K_{k} H)^\top] \tag{21}
$$

$( I- K_{k} H)$和 $K_{k}^\top$是常数，所以可以提出：

$$
\mathbb{E}[( I- K_{k} H) e_{k}^{-}{v_{k}}^\top K_{k}^\top -  K_{k} v_{k}{e_{k}^{-}}^\top( I- K_{k} H)^\top] \tag{22}
$$


$$
= ( I- K_{k} H)\mathbb{E}[ e_{k}^{-}{v_{k}}^\top] K_{k}^\top -  K_{k}\mathbb{E}[ v_{k}{e_{k}^{-}}^\top]( I- K_{k} H)^\top \tag{23}
$$

由于$e_{k}^{-}{v_{k}}^\top$以及$v_{k}{e_{k}^{-}}^\top$都相互独立，则由期望的性质：
$\mathbb{E}[e_{k}^{-}{v_{k}}^\top] = \mathbb{E}[e_{k}^{-}]\mathbb{E}[v_{k}^\top] = 0$，所以公式20可化简：

$$
\mathbb{E}[(I- K_{k} H) e_{k}^{-}{e_{k}^{-}}^\top( I- K_{k} H)^\top +  K_{k} v_{k}{v_{k}}^\top K_{k}^\top ] \tag{24}
$$

把常数项提出：

$$
= ( I- K_{k} H)\mathbb{E}[ e_{k}^{-}{e_{k}^{-}}^\top]( I- K_{k} H)^\top +  K_{k}\mathbb{E}[ v_{k}{v_{k}}^\top] K_{k}^\top \tag{25}
$$

定义$P_{k}^{-} = \mathbb{E}[ e_{k}^{-}{e_{k}^{-}}^\top]$，$Q = \mathbb{E}[ v_{k}{v_{k}}^\top]$，先验误差的协方差矩阵$P_{k}^{-}$和测量误差的协方差矩阵$Q$代入公式25：

$$
\boldsymbol P_{k} = ( I- K_{k} H)P_{k}^{-}( I- K_{k} H)^\top +  K_{k}Q K_{k}^\top \tag{26}
$$

由于$P_{k}$是协方差矩阵，所以其迹为：

$$
trace(\boldsymbol P_{k}) = trace(( I- K_{k} H)P_{k}^{-}( I- K_{k} H)^\top +  K_{k}Q K_{k}^\top) \tag{27}
$$

又迹的线性性质，且展开得到：

$$
tr(P_{k}) = tr(( I- K_{k} H)P_{k}^{-}( I- K_{k} H)^\top) + tr( K_{k}Q K_{k}^\top) \tag{28}
$$


$$
  = tr(P_{k}^{-}) + tr( K_{k}Q K_{k}^\top) + tr(K_{k}HP_{k}^{-}H K_{k}^\top) - tr(P_{k}^{-}H K_{k}^\top) - tr(K_{k}HP_{k}^{-})\tag{29}
$$

由于 $P_{k}^{-}$ 是先验误差的协方差矩阵，因此 $P_{k}^{-} = P_{k}^{-\top}$ ，所以 $tr(P_{k}^{-}) = P_{k}^{-\top}$ ，不难看出公式29后两项是互为转置的，其迹相等，所以公式29可以化简为：

$$
tr(P_{k}) = tr(P_{k}^{-}) + tr( K_{k}Q K_{k}^\top) + tr(K_{k}HP_{k}^{-}H K_{k}^\top)+2tr(K_{k}HP_{k}^{-}) \tag{30}
$$

还记得我们的初心：找到一个$K_{k}$使得$trace$最小，所以我们需要对$K_{k}$求导，并令其等于0，则：

$$
\frac{\partial tr(P_{k})}{\partial K_{k}} = 0 \tag{31}
$$

由$\frac{\partial tr(AB)}{\partial A} = B^T$和$\frac{\partial tr(ABA^T)}{\partial A} = 2AB$得（论证可自行用两个2维矩阵计算）：

$$
\frac{\partial tr( K_{k}Q K_{k}^\top)}{\partial K_{k}}  = 2Q K_{k} \tag{32}
$$

$$
\frac{\partial tr(K_{k}HP_{k}^{-}H K_{k}^\top)}{\partial K_{k}}  = 2K_{k} H P_{k}^{-} H \tag{33}
$$


$$
\frac{\partial 2tr(K_{k}HP_{k}^{-})}{\partial K_{k}}  = 2 P_{k}^{-}H^\top  \tag{34}
$$

代入公式31整理得：

$$
\frac{\partial tr(P_{k})}{\partial K_{k}} = 2Q K_{k} + 2K_{k} H P_{k}^{-} H - 2 P_{k}^{-}H^\top = 0 \tag{35}
$$

$$
Q K_{k} + K_{k} H P_{k}^{-} H -  P_{k}^{-}H^\top = 0 \tag{36}
$$

$$
K_{k} (Q + H P_{k}^{-} H) = P_{k}^{-}H^\top \tag{37}
$$


$$
K_{k} = P_{k}^{-}H^\top (Q + H P_{k}^{-} H)^{-1} \tag{38}
$$

其中$P_{k}^{-}$是先验误差的协方差矩阵，$H$是观测矩阵，$Q$是测量噪声的协方差矩阵。至此我们费了很多功夫推导出了卡尔曼增益$K_{k}$。

# 3.$P_{k}^{-}$的求解推导
由于$P_{k}^{-}$是先验误差的协方差矩阵，所以其定义为：

$$
P_{k}^{-} = \mathbb{E}[\,(x_{k}-\hat x_{k}^{-})\,(x_{k}-\hat x_{k}^{-})^\top\,] \tag{1}
$$

先进行$(x_{k}-\hat x_{k}^{-})$的求解，代入第二章节公式8：

$$
e_{k}^{-} = Ax_{k-1} + Bu_{k-1} + w_{k-1} - A\hat x_{k-1} - Bu_{k-1}\tag{2}
$$


$$
= A(x_{k-1} - \hat x_{k-1}) + w_{k-1} \tag{3}
$$

又有$e_{k-1} = x_{k-1} - \hat x_{k-1}$:

$$
e_{k}^{-} = Ae_{k-1} + w_{k-1} \tag{4}
$$

代入公式1：

$$
P_{k}^{-} =  \mathbb{E}[(Ae_{k-1} + w_{k-1})(Ae_{k-1} + w_{k-1})^\top] \tag{5}
$$

展开得：

$$
P_{k}^{-} =  \mathbb{E}[Ae_{k-1}e_{k-1}^\top A^\top + Ae_{k-1}w_{k-1}^\top + w_{k-1}e_{k-1}^\top A^\top + w_{k-1}w_{k-1}^\top] \tag{6}
$$

由期望的性质（前文也有所用到，在此不做详细阐述）$A$是常数，$e_{k-1}与w_{k-1}$相互独立且期望为0，整理如下：

$$
P_{k}^{-} =  \mathbb{E}[Ae_{k-1}e_{k-1}^\top A^\top] + \mathbb{E}[w_{k-1}w_{k-1}^\top] \tag{7}
$$


$$
P_{k}^{-} =  A\mathbb{E}[e_{k-1}e_{k-1}^\top] A^\top + Q \tag{8}
$$


$$
=  A P_{k-1} A^\top + Q \tag{9}
$$

其中$P_{k-1}$是$e_{k-1}$误差的协方差矩阵，$Q$是过程噪声的协方差矩阵。至此我们推导出了$P_{k}^{-}$。
# 4.kalman滤波的迭代过程与总结
至此我们完成了所有的推导，这是一个递归的过程，过程如下：
（1）时间更新阶段：根据系统状态转移方程，由 $k-1$ 时刻的后验最优状态估计与协方差矩阵，预测得到 $k$ 时刻未利用观测信息的先验状态与先验误差协方差：

$$\hat x_{k}^{-} = A\hat x_{k-1} + Bu_{k-1}$$


$$P_{k}^{-} = A P_{k-1} A^\top + Q$$

其中，$\hat x_{k-1}$、$P_{k-1}$ 为上一时刻的最优状态估计与误差协方差矩阵，$A$ 为状态转移矩阵，$B$ 为控制输入矩阵，$Q$ 为系统过程噪声协方差矩阵，用于描述模型建模误差与系统扰动的不确定性。

（2）测量更新阶段：引入 $k$ 时刻传感器观测信息，对先验预测结果进行修正，得到当前时刻最优后验估计。首先计算卡尔曼增益，自适应权衡模型预测可信度与传感器观测可信度：

$$K_{k} = P_{k}^{-}H^\top (H P_{k}^{-} H + R)^{-1}$$

随后利用观测残差修正先验状态，观测残差反映实际观测值与模型预测观测值的偏差，通过卡尔曼增益加权修正后，得到当前时刻最优状态估计：

$$\hat x_{k} = \hat x_{k}^{-} + K_{k} (z_{k} - H\hat x_{k}^{-})$$

最后采用 Joseph 稳定形式更新误差协方差矩阵，该形式可保证数值迭代过程中协方差矩阵始终保持对称正定，有效提升滤波算法的数值稳定性:

$$P_{k} = ( I- K_{k} H)P_{k}^{-}( I- K_{k} H)^\top + K_{k}R K_{k}^\top$$

其中，$H$ 为观测矩阵，$R$ 为观测噪声协方差矩阵，$z_{k}$ 为当前时刻观测数据。
完成单次迭代后，$\hat x_k$ 与 $P_{k}$ 作为下一时刻迭代的初始后验信息，持续递归更新，实现对系统状态的连续最优估计。

后续有机会将更新关于非线性系统EKF的推导，欢迎批评指正。







