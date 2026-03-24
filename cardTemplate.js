/**
 * Builds the KPCC membership card JSX object for Satori.
 * Satori requires inline styles only — no CSS classes.
 *
 * The background image already contains:
 *   - Logo + "KARANATAKA PRADESH CONGRESS COMMITTEE" header
 *   - Address line
 *   - "Signature" label at bottom-right
 *   - Tricolor watercolor design
 *
 * So this function ONLY renders the photo box and the field rows
 * positioned on top of the background image.
 *
 * @param {Object} data
 * @param {string} data.name
 * @param {string} data.membershipId
 * @param {string} data.epicNo
 * @param {string} data.phoneNumber
 * @param {string} data.acNo
 * @param {string} data.constituency
 * @param {string|null} data.photoBase64  – full data-URI, e.g. "data:image/jpeg;base64,..."
 * @param {string|null} data.signatureBase64
 * @param {string|null} data.bgBase64     – full data-URI of the background image
 * @returns {Object} Satori-compatible React-element tree
 */
export function buildCardElement({
  name = "",
  membershipId = "",
  epicNo = "",
  phoneNumber = "",
  acNo = "",
  constituency = "",
  photoBase64 = null,
  signatureBase64 = null,
  bgBase64 = null,
}) {
  const CARD_W = 600;
  const CARD_H = 375;

  // ── reusable field row ───────────────────────────────────────────────────
  const Field = (label, value) => ({
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "row",
        alignItems: "baseline",
        marginBottom: 7,
      },
      children: [
        {
          type: "span",
          props: {
            style: {
              fontWeight: 700,
              fontSize: 13,
              color: "#111",
              width: 126,
              flexShrink: 0,
            },
            children: label + ":",
          },
        },
        {
          type: "span",
          props: {
            style: {
              fontSize: 13,
              color: "#222",
              fontWeight: 500,
            },
            children: value || "",
          },
        },
      ],
    },
  });

  // ── photo box ────────────────────────────────────────────────────────────
  const PhotoBox = {
    type: "div",
    props: {
      style: {
        width: 110,
        height: 140,
        border: "2px solid #555",
        borderRadius: 4,
        background: "#000",          // solid black when no photo
        marginRight: 22,
        flexShrink: 0,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
      children: photoBase64
        ? {
            type: "img",
            props: {
              src: photoBase64,
              width: 110,
              height: 140,
              style: { objectFit: "cover" },
            },
          }
        : {
            type: "span",
            props: {
              style: { color: "#fff", fontSize: 12 },
              children: "",
            },
          },
    },
  };

  // ── signature image (sits just above the "Signature" label in the bg) ───
  const SignatureImage = signatureBase64
    ? {
        type: "div",
        props: {
          style: {
            position: "absolute",
            bottom: 30,           // sit just above the "Signature" text in the bg
            right: 24,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
          },
          children: {
            type: "img",
            props: {
              src: signatureBase64,
              width: 90,
              height: 34,
              style: { objectFit: "contain" },
            },
          },
        },
      }
    : { type: "div", props: { style: {}, children: "" } };

  // ── root card ────────────────────────────────────────────────────────────
  return {
    type: "div",
    props: {
      style: {
        width: CARD_W,
        height: CARD_H,
        position: "relative",
        fontFamily: "sans-serif",
        display: "flex",
        flexDirection: "column",
      },
      children: [
        // ── 1. Background image (full card) ──────────────────────────────
        {
          type: "img",
          props: {
            src: bgBase64,
            width: CARD_W,
            height: CARD_H,
            style: {
              position: "absolute",
              top: 0,
              left: 0,
              width: CARD_W,
              height: CARD_H,
            },
          },
        },

        // ── 2. Content overlay (photo + fields only) ─────────────────────
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              // Push below the header area in the background image (~130px tall)
              top: 130,
              left: 0,
              width: CARD_W,
              height: CARD_H - 130,
              display: "flex",
              flexDirection: "row",
              alignItems: "flex-start",
              padding: "16px 20px 16px 53px",
            },
            children: [
              PhotoBox,
              // ── fields column ────────────────────────────────────────
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    paddingTop: 4,
                  },
                  children: [
                    Field("Name", name),
                    Field("Membership ID", membershipId),
                    Field("EPIC No", epicNo),
                    Field("Phone Number", phoneNumber),
                    Field("AC No", acNo),
                    Field("Constituency", constituency),
                  ],
                },
              },
            ],
          },
        },

        // ── 3. Optional signature image above the bg "Signature" label ───
        SignatureImage,
      ],
    },
  };
}