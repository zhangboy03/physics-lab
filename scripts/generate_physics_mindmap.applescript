property slideWidth : 1920
property slideHeight : 1080

property titleColor : {17, 43, 73}
property subtitleColor : {74, 103, 128}
property footerColor : {118, 136, 154}
property nodeTextColor : {250, 252, 248}

on run
	set outputPath to POSIX path of (path to desktop folder) & "高中物理知识点思维导图.key"
	do shell script "/bin/rm -rf " & quoted form of outputPath
	do shell script "/bin/rm -rf " & quoted form of "/Users/keeplearning/Desktop/Projects/physics-lab/tmp-smoke-test.key"
	
	tell application "Keynote"
		activate
		repeat with d in every document
			try
				if (name of d) is "tmp-smoke-test.key" then close d saving no
			end try
		end repeat
		
		set deck to make new document with properties {document theme:theme "Graph Paper", width:slideWidth, height:slideHeight}
		tell deck
			set base slide of slide 1 to master slide "Blank"
		end tell
	end tell
	
	tell application "Keynote"
		set coverSlide to slide 1 of deck
	end tell
	my buildCoverSlide(coverSlide)
	
	repeat with chapterRecord in my chapterData()
		my buildChapterSlide(deck, contents of chapterRecord)
	end repeat
	
	tell application "Keynote"
		save deck in (POSIX file outputPath)
		close deck saving yes
		open POSIX file outputPath
		activate
	end tell
	
	return outputPath
end run

on chapterData()
	return {¬
		{chapterTitle:"第1章 运动的描述", chapterSubtitle:"从描述语言到图像表达", conceptItems:{"参考系与质点", "位移与路程", "时间与时刻", "标量与矢量"}, lawItems:{"平均速度", "瞬时速度", "x-t 图像", "v-t 图像"}, methodItems:{"图像读图", "语言转公式", "单位换算", "规范作图"}}, ¬
		{chapterTitle:"第2章 力与牛顿定律", chapterSubtitle:"受力分析是动力学入口", conceptItems:{"重力弹力摩擦力", "受力分析", "平衡状态", "惯性"}, lawItems:{"力的合成分解", "牛顿三定律", "F = ma", "整体与隔离"}, methodItems:{"斜面模型", "连接体模型", "临界与极值", "验证牛顿第二定律"}}, ¬
		{chapterTitle:"第3章 曲线运动与万有引力", chapterSubtitle:"分解思想贯穿平抛、圆周与航天", conceptItems:{"平抛运动", "匀速圆周运动", "向心力", "万有引力"}, lawItems:{"运动分解", "a = v² / r", "F向 = mv² / r", "GMm / r²"}, methodItems:{"平抛分解", "圆周临界", "卫星轨道", "宇宙速度"}}, ¬
		{chapterTitle:"第4章 功、机械能与动量", chapterSubtitle:"守恒观点解决多过程问题", conceptItems:{"功与功率", "动能与势能", "机械能守恒", "动量与冲量"}, lawItems:{"W = Fs cosθ", "动能定理", "机械能守恒", "动量守恒"}, methodItems:{"传送带模型", "碰撞与反冲", "子弹木块", "功率与效率"}}, ¬
		{chapterTitle:"第5章 振动、机械波与光", chapterSubtitle:"从周期现象过渡到波与成像", conceptItems:{"简谐运动", "周期频率振幅", "波长波速频率", "干涉衍射偏振"}, lawItems:{"振动图像", "波动图像", "v = λf", "反射折射成像"}, methodItems:{"单摆测 g", "波形图判向", "双缝干涉", "凸透镜成像"}}, ¬
		{chapterTitle:"第6章 电场与恒定电流", chapterSubtitle:"场的观点配合电路分析", conceptItems:{"电荷与库仑力", "电场强度", "电势与电势差", "电阻与电路"}, lawItems:{"E = F / q", "U = W / q", "欧姆定律", "串并联规律"}, methodItems:{"电场线与等势面", "动态电路分析", "伏安法测电阻", "电源内外电路"}}, ¬
		{chapterTitle:"第7章 磁场、电磁感应与交变电流", chapterSubtitle:"定则判断和能量转化并重", conceptItems:{"安培力", "洛伦兹力", "磁通量", "感应电流"}, lawItems:{"左手定则", "右手定则", "法拉第电磁感应", "楞次定律"}, methodItems:{"粒子偏转", "导体棒切割", "自感与涡流", "交流有效值"}}, ¬
		{chapterTitle:"第8章 热学、原子物理与实验方法", chapterSubtitle:"微观模型、热力学与近代物理", conceptItems:{"分子动理论", "内能与热力学", "原子结构", "原子核与放射性"}, lawItems:{"理想气体状态", "热力学第一定律", "能级跃迁", "质能方程"}, methodItems:{"气体图像分析", "光电效应", "半衰期", "误差与有效数字"}}}
end chapterData

on buildCoverSlide(theSlide)
	my addTextItem(theSlide, "高中物理知识点思维导图", 108, 92, 1180, 72, 54, titleColor)
	my addTextItem(theSlide, "按通用高中物理主线拆成章节页，已经适配 Keynote 继续增删节点。", 112, 168, 980, 32, 20, subtitleColor)
	my addTextItem(theSlide, "文件可直接二次编辑；若教材版本不同，可拖动节点调整顺序。", 112, 996, 920, 24, 15, footerColor)
	
	set rootX to 122
	set rootY to 358
	set rootW to 328
	set rootH to 228
	
	set moduleX to 630
	set moduleW to 560
	set moduleH to 118
	set moduleTexts to {¬
		"力学基础" & return & "运动的描述｜力与牛顿定律", ¬
		"力学拓展" & return & "曲线运动｜引力航天｜机械能｜动量", ¬
		"波动与电学" & return & "振动波光｜电场与恒定电流", ¬
		"磁场与近代" & return & "电磁感应｜交变电流｜热学｜原子物理｜实验"}
	
	set moduleYs to {146, 348, 550, 752}
	
	repeat with idx from 1 to count of moduleTexts
		set currentY to item idx of moduleYs
		my addConnector(theSlide, rootX + rootW, rootY + (rootH / 2), moduleX, currentY + (moduleH / 2))
	end repeat
	
	my addNode(theSlide, "高中物理" & return & "知识导图", rootX, rootY, rootW, rootH, 38, 100)
	
	repeat with idx from 1 to count of moduleTexts
		my addNode(theSlide, item idx of moduleTexts, moduleX, item idx of moduleYs, moduleW, moduleH, 24, 86)
	end repeat
end buildCoverSlide

on buildChapterSlide(theDeck, chapterRecord)
	tell application "Keynote"
		tell theDeck
			set theSlide to make new slide with properties {base slide:master slide "Blank"}
		end tell
	end tell
	
	set chapterTitleText to chapterTitle of chapterRecord
	set chapterSubtitleText to chapterSubtitle of chapterRecord
	set conceptItemsList to conceptItems of chapterRecord
	set lawItemsList to lawItems of chapterRecord
	set methodItemsList to methodItems of chapterRecord
	
	my addTextItem(theSlide, chapterTitleText, 106, 78, 1160, 58, 34, titleColor)
	my addTextItem(theSlide, chapterSubtitleText, 110, 136, 820, 28, 18, subtitleColor)
	my addTextItem(theSlide, "通用高中物理章节结构，可按教材版本微调。", 110, 996, 640, 22, 14, footerColor)
	
	set rootX to 94
	set rootY to 424
	set rootW to 266
	set rootH to 164
	
	my addBranch(theSlide, rootX, rootY, rootW, rootH, 470, 145, "核心概念", conceptItemsList)
	my addBranch(theSlide, rootX, rootY, rootW, rootH, 470, 435, "重点规律", lawItemsList)
	my addBranch(theSlide, rootX, rootY, rootW, rootH, 470, 725, "题型 / 实验", methodItemsList)
	
	my addNode(theSlide, chapterTitleText, rootX, rootY, rootW, rootH, 28, 100)
end buildChapterSlide

on addBranch(theSlide, rootX, rootY, rootW, rootH, categoryX, categoryY, categoryLabel, childItems)
	set categoryW to 244
	set categoryH to 90
	set childW to 240
	set childH to 78
	set leftChildX to 850
	set rightChildX to 1185
	set topChildY to categoryY - 55
	set bottomChildY to topChildY + 105
	set childXPositions to {leftChildX, rightChildX, leftChildX, rightChildX}
	set childYPositions to {topChildY, topChildY, bottomChildY, bottomChildY}
	
	my addConnector(theSlide, rootX + rootW, rootY + (rootH / 2), categoryX, categoryY + (categoryH / 2))
	
	repeat with idx from 1 to count of childItems
		set childX to item idx of childXPositions
		set childY to item idx of childYPositions
		my addConnector(theSlide, categoryX + categoryW, categoryY + (categoryH / 2), childX, childY + (childH / 2))
	end repeat
	
	my addNode(theSlide, categoryLabel, categoryX, categoryY, categoryW, categoryH, 24, 86)
	
	repeat with idx from 1 to count of childItems
		my addNode(theSlide, item idx of childItems, item idx of childXPositions, item idx of childYPositions, childW, childH, 18, 72)
	end repeat
end addBranch

on addTextItem(theSlide, itemText, xPos, yPos, itemWidth, itemHeight, fontSizeValue, rgbColor)
	tell application "Keynote"
		tell theSlide
			set newTextItem to make new text item with properties {position:{xPos, yPos}, width:itemWidth, height:itemHeight, object text:itemText}
			set size of object text of newTextItem to fontSizeValue
			set color of object text of newTextItem to my rgb16(rgbColor)
			return newTextItem
		end tell
	end tell
end addTextItem

on addNode(theSlide, nodeText, xPos, yPos, nodeWidth, nodeHeight, fontSizeValue, nodeOpacity)
	tell application "Keynote"
		tell theSlide
			set newShape to make new shape with properties {position:{xPos, yPos}, width:nodeWidth, height:nodeHeight}
			set object text of newShape to nodeText
			set opacity of newShape to nodeOpacity
			set size of object text of newShape to fontSizeValue
			set color of object text of newShape to my rgb16(nodeTextColor)
			return newShape
		end tell
	end tell
end addNode

on addConnector(theSlide, startX, startY, endX, endY)
	tell application "Keynote"
		tell theSlide
			return make new line with properties {start point:{startX, startY}, end point:{endX, endY}}
		end tell
	end tell
end addConnector

on rgb16(rgbColor)
	set {redValue, greenValue, blueValue} to rgbColor
	return {redValue * 257, greenValue * 257, blueValue * 257}
end rgb16
