
// Helper to generate random buffer for challenge
const getRandomBuffer = () => {
    const arr = new Uint8Array(32);
    window.crypto.getRandomValues(arr);
    return arr;
};

// Check if device supports WebAuthn
export const isBiometricsSupported = async (): Promise<boolean> => {
    if (!window.PublicKeyCredential) {
        return false;
    }
    // Check if the device has a platform authenticator (FaceID, TouchID, Windows Hello)
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
};

// Trigger the registration prompt (used when enabling the feature)
// This asks the user to confirm with FaceID/TouchID to "create" a link
export const registerBiometrics = async (): Promise<boolean> => {
    try {
        const publicKey: PublicKeyCredentialCreationOptions = {
            challenge: getRandomBuffer(),
            rp: {
                name: "LensLegend App",
                id: window.location.hostname,
            },
            user: {
                id: getRandomBuffer(),
                name: "User",
                displayName: "LensLegend User",
            },
            pubKeyCredParams: [{ alg: -7, type: "public-key" }],
            authenticatorSelection: {
                authenticatorAttachment: "platform", // Forces built-in scanner (FaceID/TouchID)
                userVerification: "required",
            },
            timeout: 60000,
            attestation: "none"
        };

        const credential = await navigator.credentials.create({ publicKey });
        return !!credential;
    } catch (error) {
        console.error("Biometric registration failed:", error);
        return false;
    }
};

// Trigger the verification prompt (used to unlock)
export const verifyBiometrics = async (): Promise<boolean> => {
    try {
        const publicKey: PublicKeyCredentialRequestOptions = {
            challenge: getRandomBuffer(),
            rpId: window.location.hostname,
            userVerification: "required", // This forces the FaceID/Passcode prompt
            timeout: 60000,
        };

        const assertion = await navigator.credentials.get({ publicKey });
        return !!assertion;
    } catch (error) {
        console.error("Biometric verification failed:", error);
        return false;
    }
};
