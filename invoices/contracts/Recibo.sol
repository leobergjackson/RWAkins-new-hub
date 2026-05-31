// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract Recibo is ReentrancyGuard {
    IERC20 public immutable usdc;

    error AlreadyPaid();
    error TransferFailed();
    error ZeroAddress();
    error InvoiceDoesNotExist();

    enum InvoiceStatus { Pending, Paid }

    struct Invoice {
        bytes32 id;
        string clientName;
        address freelancer;
        uint256 amount;
        string description;
        uint256 dueDate;
        InvoiceStatus status;
        uint256 createdAt;
    }

    mapping(bytes32 => Invoice) public invoices;
    mapping(bytes32 => bool) public invoiceExists;

    event InvoiceCreated(
        bytes32 indexed invoiceId,
        address indexed freelancer,
        string clientName,
        uint256 amount,
        uint256 dueDate
    );

    event InvoicePaid(
        bytes32 indexed invoiceId,
        address indexed payer,
        address indexed freelancer,
        uint256 amount,
        uint256 timestamp
    );

    constructor(address _usdc) {
        if (_usdc == address(0)) revert ZeroAddress();
        usdc = IERC20(_usdc);
    }

    function createInvoice(
        bytes32 invoiceId,
        string calldata clientName,
        uint256 amount,
        string calldata description,
        uint256 dueDate
    ) external {
        if (amount == 0) revert TransferFailed(); // Just as a simple check

        invoices[invoiceId] = Invoice({
            id: invoiceId,
            clientName: clientName,
            freelancer: msg.sender,
            amount: amount,
            description: description,
            dueDate: dueDate,
            status: InvoiceStatus.Pending,
            createdAt: block.timestamp
        });
        invoiceExists[invoiceId] = true;

        emit InvoiceCreated(invoiceId, msg.sender, clientName, amount, dueDate);
    }

    function payInvoice(bytes32 invoiceId) external nonReentrant {
        if (!invoiceExists[invoiceId]) revert InvoiceDoesNotExist();
        
        Invoice storage inv = invoices[invoiceId];
        
        if (inv.freelancer == address(0)) revert ZeroAddress();
        if (inv.status == InvoiceStatus.Paid) revert AlreadyPaid();

        inv.status = InvoiceStatus.Paid;

        if (!usdc.transferFrom(msg.sender, inv.freelancer, inv.amount)) {
            revert TransferFailed();
        }

        emit InvoicePaid(invoiceId, msg.sender, inv.freelancer, inv.amount, block.timestamp);
    }

    function getInvoice(bytes32 invoiceId) external view returns (Invoice memory) {
        return invoices[invoiceId];
    }
}
