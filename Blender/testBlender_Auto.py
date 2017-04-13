
#coding:utf-8 
# try: 
#   import xml.etree.cElementTree as ET 
# except ImportError: 
#   import xml.etree.ElementTree as ET 
# import sys 


import json

# 从文件中读取数据
import xml.etree.ElementTree as ET

#全局唯一标识
unique_id = 1

#遍历所有的节点
def walkData(root_node, level, result_list):
    global unique_id
    temp_list =[unique_id, level, root_node.tag, root_node.attrib]
    result_list.append(temp_list)
    unique_id += 1
    
    #遍历每个子节点
    children_node = root_node.getchildren()
    if len(children_node) == 0:
        return
    for child in children_node:
        walkData(child, level + 1, result_list)
    return

#获得原始数据
#out:
#[
#    #ID, Level, Attr Map
#    [1, 1, {'ID':1, 'Name':'test1'}],
#    [2, 1, {'ID':1, 'Name':'test2'}],
#]
def getXmlData(file_name):
    level = 1 #节点的深度从1开始
    result_list = []
    root = ET.parse(file_name).getroot()
    walkData(root, level, result_list)

    return result_list

if __name__ == '__main__':
    file_name = 'C:\Users\Mooji\Downloads\Crossing8Course\Crossing8Course\Crossing8Course.xml'
    R = getXmlData(file_name)

    CLICK_NUM = 0

    print "import bpy"
    print "  "

    for x in R:
        # print x[2]

        if x[2] == 'geometry':
            # print type(x[3])
            # print x[3]["x"]
            # python_to_json = json.loads(x[3])
            # print type(python_to_json)

            if CLICK_NUM == 0 :

                print "bpy.ops.curve.primitive_nurbs_curve_add()"

                print "obj = bpy.data.objects['NurbsCurve']"
                print "obj.data.resolution_u = 16"
                print "obj.location.x = "+x[3]["x"]
                print "obj.location.y = "+x[3]["y"]
                print "obj.location.z = 0"
                print "obj.rotation_euler.z = "+x[3]["hdg"]
                print "obj.scale.x = "+x[3]["length"]

            else:

               

                print "bpy.ops.curve.primitive_nurbs_curve_add()"

                tempStr = ""    
                # print len(str(CLICK_NUM))
                if len(str(CLICK_NUM)) == 1 :
                    tempStr = "NurbsCurve."+"00"+str(CLICK_NUM)
                elif len(str(CLICK_NUM)) == 2 :
                    tempStr = "NurbsCurve."+"0"+str(CLICK_NUM)
                pass   

                print "obj = bpy.data.objects['"+tempStr+"']"
                print "obj.data.resolution_u = 16"
                print "obj.location.x = "+x[3]["x"]
                print "obj.location.y = "+x[3]["y"]
                print "obj.location.z = 0"
                print "obj.rotation_euler.z = "+x[3]["hdg"]
                print "obj.scale.x = "+x[3]["length"]
            
            pass
            print " "

            CLICK_NUM = CLICK_NUM + 1

            

        pass
            
    pass

    CLICK_NUM = 0
    for x in R:
        if x[2] == 'geometry':
            if CLICK_NUM == 0 :
                print "obj = bpy.data.objects['NurbsCurve']"
                print "obj.select = True"
            else:
                tempStr = ""    
                # print len(str(CLICK_NUM))
                if len(str(CLICK_NUM)) == 1 :
                    tempStr = "NurbsCurve."+"00"+str(CLICK_NUM)
                elif len(str(CLICK_NUM)) == 2 :
                    tempStr = "NurbsCurve."+"0"+str(CLICK_NUM)
                pass   

                print "obj = bpy.data.objects['"+tempStr+"']"
                print "obj.select = True"
            pass
            CLICK_NUM = CLICK_NUM + 1
        pass

    print "bpy.ops.object.convert(target='MESH')"
    print "  "

    print "C = bpy.context"
    print "scene = C.scene  "


    CLICK_NUM = 0
    for x in R:
        if x[2] == 'geometry':
         
            tempStr = ""    
            # print len(str(CLICK_NUM))
            if CLICK_NUM == 0 :
                tempStr = "NurbsCurve"
            elif len(str(CLICK_NUM)) == 1 :
                tempStr = "NurbsCurve."+"00"+str(CLICK_NUM)
            elif len(str(CLICK_NUM)) == 2 :
                tempStr = "NurbsCurve."+"0"+str(CLICK_NUM)
            pass   

            
            print "bpy.ops.object.select_all(action='DESELECT')"
            print "obj = bpy.data.objects['"+tempStr+"'].select = True"
            print "scene.objects.active = bpy.data.objects['"+tempStr+"']"
            print "bpy.ops.object.modifier_add(type='SKIN')"
            print "bpy.ops.object.modifier_apply(apply_as='DATA',modifier=\"Skin\")"
        
            CLICK_NUM = CLICK_NUM + 1

            print "  "
        pass


    
    print "  "
 
# try: 
#   tree = ET.parse("/Users/Jerry/Desktop/createModle/Crossing8Course.xml")     #打开xml文档 
#   root = tree.getroot()         #获得root节点  
# except Exception, e: 
#   print "Error:cannot parse file:country.xml." 
#   sys.exit(1) 
# print root.tag, "---", root.attrib  
# for child in root: 
#   print child.tag, "---", child.attrib 


