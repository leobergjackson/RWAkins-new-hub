// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MockBASAttestation — Simulates BNB Attestation Service for demo
 */
contract MockBASAttestation {
    struct Attestation {
        address attester;
        address subjectToken;
        string attestationType;
        bytes32 evidenceHash;
        uint256 timestamp;
    }

    mapping(uint64 => Attestation) public attestations;
    uint64 public nextUID = 1000;

    event AttestationSubmitted(
        uint64 uid,
        address indexed attester,
        address indexed subject,
        string attestationType
    );

    function submitAttestation(
        address subjectToken,
        string calldata attestationType,
        bytes32 evidenceHash
    ) external returns (uint64 uid) {
        uid = nextUID++;
        attestations[uid] = Attestation({
            attester: msg.sender,
            subjectToken: subjectToken,
            attestationType: attestationType,
            evidenceHash: evidenceHash,
            timestamp: block.timestamp
        });
        emit AttestationSubmitted(uid, msg.sender, subjectToken, attestationType);
    }

    function getAttestation(uint64 uid) external view returns (Attestation memory) {
        return attestations[uid];
    }
}
