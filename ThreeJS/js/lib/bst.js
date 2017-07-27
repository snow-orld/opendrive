/*
* bst.js - binary search tree
*/

var BinarySearchTree = function() {
	
	this.root = null;
	this.count = 0;
}

BinarySearchTree.Node = function(value) {
	// body...
	this.value = value || 0;
	this.left = null;
	this.right = null;
	this.parent = null;
	this.childrenCnt = 0;
};

BinarySearchTree.Node.prototype.getValue = function() {
	// body...
	return this.value;
};

BinarySearchTree.Node.prototype.getLeft = function() {
	// body...
	return this.left;
};

BinarySearchTree.Node.prototype.getRight = function() {
	// body...
	return this.right;
};

BinarySearchTree.Node.prototype.getChildrenCnt = function() {
	// body...
	
};

BinarySearchTree.prototype.search = function(value) {
	// body...
	
	function searchhelper(value, node) {

		if (node == null) {
			return false;
		}

		if (value == node.value) {
			return node;
		} else if (value < node.value) {
			return searchhelper(value, node.left);
		} else {
			return searchhelper(value, node.right);
		}
	}

	return searchhelper(value, this.root);
};

BinarySearchTree.prototype.insert = function(value) {
	// body...
	
	function insertHelper(value, node, parent) {

		if (node == null) {
			node = new this.Node(value);
			node.parent = parent;
		} else {
			if (value < node.value) {
				insertHelper(value, node.left, node);
				node.childrenCnt++;
			} else if (value > node.value) {
				insertHelper(value, node.right, node);
				node.childrenCnt++;
			} else {
				return false;
			}
		}

	}

	this.count++;
};

BinarySearchTree.prototype.delete = function(value) {
	// body...

};