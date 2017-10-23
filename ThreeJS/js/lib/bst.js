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
	return this.childrenCnt;
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
			return true;
		} else {
			if (value < node.value) {
				node.childrenCnt++;
				return insertHelper(value, node.left, node);
			} else if (value > node.value) {
				node.childrenCnt++;
				return insertHelper(value, node.right, node);
			} else {
				return false;
			}
		}

	}

	if (!insertHelper(value, this.node, null)) {
		this.count++;
	}
};

BinarySearchTree.prototype.delete = function(value) {
	// body...

	function deleteHelper(value, node) {

		var deleted = false;

		if (node == null) {
			return deleted;
		} else {
			if (value < node.value) {
				deleted = deleteHelper(value, node.left);
				if (deleted) {
					node.childrenCnt--;
				}
				return deleted;
			} else if (value > node.value) {
				deleted = deleteHelper(value, node.right);
				if (deleted) {
					node.childrenCnt--;
				}
				return deleted;
			} else {

				if (node.left == null && node.right == null) {
					node = null;
				} else if (node.left == null) {
					node.right.parent = node.parent;
					node = node.right;
				} else if (node.right == null) {
					node.left.parent = node.parent;
					node = node.left;
				} else {

				}

				deleted = true;
				return deleted;
			}
		}
	}
};