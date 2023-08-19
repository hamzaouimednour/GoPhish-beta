package models

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"errors"
	"fmt"
	"io/ioutil"

	log "github.com/gophish/gophish/logger"
)

var publicKeyFile = "./config/certs/public.key"
var privateKeyFile = "./config/certs/private.key"
var bits = 2048

func LoadKey(uid int64) (string, error) {
	var keyUser int64
	u, err := GetUser(uid)
	if err != nil {
		log.Error(err)
	}
	if u.Role.Slug == "admin" || u.Role.Slug == "teamAdmin" {
		keyUser = u.Id
	} else {
		err = db.Table("users").
			Joins("INNER JOIN roles ON roles.id = users.role_id").
			Where("users.teamid = ?", u.Teamid).
			Where("roles.slug = ?", "teamAdmin").
			Select("users.id").
			First(&keyUser).Error
		if err != nil {
			log.Error(err)
		}
	}
	o, err := GetOption("PUBLIC_KEY", keyUser)
	if err != nil {
		log.Error(err)
	}
	return o.Value, err
}
func LoadKeys() ([]byte, string) {
	// Load private & public keys
	publicKeyPem, _ := ioutil.ReadFile(publicKeyFile)
	privateKeyPemString := ""
	privateKeyPem, _ := ioutil.ReadFile(privateKeyFile)

	// Re Init private & public keys
	if len(publicKeyPem) < 1 || len(privateKeyPem) < 1 {
		privateKey, publicKey := GenerateKeyPair(bits)
		// Save public key as PEM file on the server
		publicKeyPem = []byte(ExportPublicKeyAsPem(publicKey))
		err := ioutil.WriteFile(publicKeyFile, publicKeyPem, 0644)
		if err != nil {
			log.Fatal(err)
		}
		// Save private key as PEM file on the server
		privateKeyPemString = ExportPrivateKeyAsPem(privateKey)
		err = ioutil.WriteFile(privateKeyFile, []byte(privateKeyPemString), 0644)
		if err != nil {
			log.Fatal(err)
		}
	}
	return publicKeyPem, privateKeyPemString
}

func EncryptData(data string, uid int64) (string, error) {
	// convert string data to bytes
	message := []byte(data)
	// Load private / public keys
	// publicKeyPem, _ := LoadKeys()
	publicKeyPem, _ := LoadKey(uid)
	if len(publicKeyPem) == 0 {
		return data, nil
	}
	// Encryption process
	publicKey, _ := ParseRsaPublicKeyPem(publicKeyPem)
	cipher := EncryptWithPublicKey(message, publicKey)

	return base64.StdEncoding.EncodeToString(cipher), nil
}

func DecryptData(data string) (string, error) {
	// Decode base64 encoded cipher
	cipher, err := base64.StdEncoding.DecodeString(data)
	if err != nil {
		return "", err
	}
	// Load private / public keys
	_, privateKeyPem := LoadKeys()

	// Descryption process
	privateKey, _ := ParseRsaPrivateKeyPem(privateKeyPem)
	message := DecryptWithPrivateKey(cipher, privateKey)

	return string(message), nil
}

// GenerateKeyPair generates a new key pair
func GenerateKeyPair(bits int) (*rsa.PrivateKey, *rsa.PublicKey) {
	privkey, err := rsa.GenerateKey(rand.Reader, bits)
	if err != nil {
		log.Error(err)
	}
	return privkey, &privkey.PublicKey
}

// PrivateKeyToBytes private key to bytes
func PrivateKeyToBytes(priv *rsa.PrivateKey) []byte {
	privBytes := pem.EncodeToMemory(
		&pem.Block{
			Type:  "RSA PRIVATE KEY",
			Bytes: x509.MarshalPKCS1PrivateKey(priv),
		},
	)

	return privBytes
}

// PublicKeyToBytes public key to bytes
func PublicKeyToBytes(pub *rsa.PublicKey) []byte {
	pubASN1, err := x509.MarshalPKIXPublicKey(pub)
	if err != nil {
		log.Error(err)
	}

	pubBytes := pem.EncodeToMemory(&pem.Block{
		Type:  "RSA PUBLIC KEY",
		Bytes: pubASN1,
	})

	return pubBytes
}

// BytesToPrivateKey bytes to private key
func BytesToPrivateKey(priv []byte) *rsa.PrivateKey {
	block, _ := pem.Decode(priv)
	enc := x509.IsEncryptedPEMBlock(block)
	b := block.Bytes
	var err error
	if enc {
		fmt.Println("is encrypted pem block")
		b, err = x509.DecryptPEMBlock(block, nil)
		if err != nil {
			log.Error(err)
		}
	}
	key, err := x509.ParsePKCS1PrivateKey(b)
	if err != nil {
		log.Error(err)
	}
	return key
}

// BytesToPublicKey bytes to public key
func BytesToPublicKey(pub []byte) *rsa.PublicKey {
	block, _ := pem.Decode(pub)
	enc := x509.IsEncryptedPEMBlock(block)
	b := block.Bytes
	var err error
	if enc {
		fmt.Println("is encrypted pem block")
		b, err = x509.DecryptPEMBlock(block, nil)
		if err != nil {
			log.Error(err)
		}
	}
	ifc, err := x509.ParsePKIXPublicKey(b)
	if err != nil {
		log.Error(err)
	}
	key, ok := ifc.(*rsa.PublicKey)
	if !ok {
		log.Error("not ok")
	}
	return key
}

// EncryptWithPublicKey encrypts data with public key
func EncryptWithPublicKey(msg []byte, pub *rsa.PublicKey) []byte {
	ciphertext, err := rsa.EncryptPKCS1v15(rand.Reader, pub, msg)
	if err != nil {
		log.Error(err)
	}
	return ciphertext
}

// DecryptWithPrivateKey decrypts data with private key
func DecryptWithPrivateKey(ciphertext []byte, priv *rsa.PrivateKey) []byte {
	// hash := sha512.New()
	plaintext, err := rsa.DecryptPKCS1v15(rand.Reader, priv, ciphertext)
	if err != nil {
		log.Error(err)
	}
	return plaintext
}

// Export public key as PEM file
func ExportPublicKeyAsPem(pub *rsa.PublicKey) string {
	pubKeyPem := string(pem.EncodeToMemory(&pem.Block{Type: "RSA PUBLIC KEY", Bytes: x509.MarshalPKCS1PublicKey(pub)}))
	return pubKeyPem
}

// Export private key as PEM file
func ExportPrivateKeyAsPem(priv *rsa.PrivateKey) string {
	privKeyPem := string(pem.EncodeToMemory(&pem.Block{Type: "RSA PRIVATE KEY", Bytes: x509.MarshalPKCS1PrivateKey(priv)}))
	return privKeyPem
}

// Export message as PEM file
func ExportMsgAsPemStr(msg []byte) string {
	msgPem := string(pem.EncodeToMemory(&pem.Block{Type: "MESSAGE", Bytes: msg}))
	return msgPem
}

// Parse public key from PEM file
func ParseRsaPublicKeyPem(pubPEM string) (*rsa.PublicKey, error) {
	block, _ := pem.Decode([]byte(pubPEM))
	if block == nil {
		return nil, errors.New("failed to parse PEM block containing the key")
	}

	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return nil, err
	}

	switch pub := pub.(type) {
	case *rsa.PublicKey:
		return pub, nil
	default:
		break // fall through
	}
	return nil, errors.New("Key type is not RSA")
}

// Parse private key from PEM file
func ParseRsaPrivateKeyPem(privPEM string) (*rsa.PrivateKey, error) {
	block, _ := pem.Decode([]byte(privPEM))
	if block == nil {
		return nil, errors.New("failed to parse PEM block containing the key")
	}

	priv, err := x509.ParsePKCS1PrivateKey(block.Bytes)
	if err != nil {
		return nil, err
	}

	return priv, nil
}
